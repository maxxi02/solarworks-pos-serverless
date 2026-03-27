import { NextRequest, NextResponse } from "next/server";
import MONGODB from "@/config/db";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (!auth.authorized) return auth.response!;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const search = searchParams.get("search");
    const status = searchParams.get("status"); // all, active, inactive, new
    const sortBy = searchParams.get("sortBy") || "newest";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const collection = MONGODB.collection("user");

    // 1. Base filter: role is customer (or missing) and NOT anonymous
    const baseFilter: Record<string, any> = {
      $and: [
        { $or: [{ role: "customer" }, { role: { $exists: false } }] },
        { isAnonymous: { $ne: true } },
      ],
    };

    // 2. Search filter
    if (search) {
      baseFilter.$and.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      });
    }

    // 3. Status logic (Complex filters for "active", "inactive", "new")
    // Note: status is computed in the frontend currently.
    // We'll approximate the status filter here.
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (status === "new") {
      baseFilter.$and.push({ createdAt: { $gte: sevenDaysAgo } });
    } else if (status === "inactive") {
      baseFilter.$and.push({
        $or: [{ banned: true }, { lastActive: { $lt: thirtyDaysAgo } }],
      });
    } else if (status === "active") {
      baseFilter.$and.push({
        banned: { $ne: true },
        createdAt: { $lt: sevenDaysAgo },
        $or: [
          { lastActive: { $exists: false } },
          { lastActive: { $gte: thirtyDaysAgo } },
        ],
      });
    }

    // 4. Sort
    const sort: Record<string, 1 | -1> = {};
    if (sortBy === "name") {
      sort.name = sortOrder === "asc" ? 1 : -1;
    } else {
      sort.createdAt = sortOrder === "asc" ? 1 : -1;
    }

    // 5. Build Projection
    const projection = {
      _id: 1,
      id: 1,
      name: 1,
      email: 1,
      image: 1,
      createdAt: 1,
      lastActive: 1,
      banned: 1,
      role: 1,
      isAnonymous: 1,
    };

    // 6. Execute in parallel: Paginated Results & Stats
    const [rawCustomers, totalRaw, statsResult] = await Promise.all([
      collection
        .find(baseFilter, { projection })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(baseFilter),
      collection
        .aggregate([
          {
            $match: {
              $or: [{ role: "customer" }, { role: { $exists: false } }],
              isAnonymous: { $ne: true },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              new: {
                $sum: { $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0] },
              },
              active: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $lt: ["$createdAt", sevenDaysAgo] },
                        { $ne: ["$banned", true] },
                        {
                          $or: [
                            { $eq: [{ $type: "$lastActive" }, "missing"] },
                            { $gte: ["$lastActive", thirtyDaysAgo] },
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              today: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: [{ $type: "$lastActive" }, "missing"] },
                        {
                          $gte: [
                            "$lastActive",
                            new Date(new Date().setHours(0, 0, 0, 0)),
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),
    ]);

    // 7. Fetch Order Stats for these specific customers
    const customers = await Promise.all(rawCustomers.map(async (u) => {
      const userId = u._id.toString();
      // Match customerId as string (common in this DB)
      const orderStats = await MONGODB.collection("orders").aggregate([
        { $match: { customerId: userId, queueStatus: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            totalSpent: { $sum: "$total" }
          }
        }
      ]).toArray();

      const stats = orderStats[0] || { orderCount: 0, totalSpent: 0 };
      return {
        ...u,
        orderCount: stats.orderCount,
        totalSpent: Math.round(stats.totalSpent * 100) / 100
      };
    }));

    const stats = statsResult[0] || { total: 0, new: 0, active: 0, today: 0 };

    return NextResponse.json({
      success: true,
      data: {
        customers,
        pagination: {
          total: totalRaw,
          page,
          limit,
          pages: Math.ceil(totalRaw / limit),
        },
        stats: {
          total: stats.total,
          new: stats.new,
          active: stats.active,
          today: stats.today,
        },
      },
    });
  } catch (error) {
    console.error("Customer fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}
