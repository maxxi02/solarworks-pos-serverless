import { NextResponse } from "next/server";
import MONGODB from "@/config/db";

const notifySalesUpdate = async () => {
  try {
    await fetch(`${process.env.SOCKET_URL}/internal/sales-updated`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.BETTER_AUTH_SECRET || "",
      },
    });
  } catch (err) {
    console.warn("Could not notify socket server:", err);
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.orderNumber || !body.total || !body.paymentMethod) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const collection = MONGODB.collection("payments");

    const result = await collection.insertOne({
      ...body,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Payment saved with ID:", result.insertedId);
    notifySalesUpdate();

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId,
        ...body,
      },
    });
  } catch (error) {
    console.error("Payment save error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save payment" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "10");
    const page  = parseInt(searchParams.get("page")  || "1");
    const skip  = (page - 1) * limit;

    const status        = searchParams.get("status");
    const paymentMethod = searchParams.get("paymentMethod");
    const search        = searchParams.get("search");
    const startDate     = searchParams.get("startDate");
    const endDate       = searchParams.get("endDate");
    const sortBy        = searchParams.get("sortBy")    || "date";
    const sortOrder     = searchParams.get("sortOrder") || "desc";

    // ── Build filter ─────────────────────────────────────────────────────────
    const filter: Record<string, any> = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (paymentMethod && paymentMethod !== "all") {
      filter.paymentMethod = paymentMethod;
    }

    if (search) {
      filter.$or = [
        { orderNumber:  { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { cashier:      { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      // Support both old records (createdAt only) and new records (timestamp field)
      const dateFilter: Record<string, any> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate)   dateFilter.$lte = new Date(endDate);

      const dateConditions = [
        { timestamp: dateFilter },
        { createdAt: dateFilter },
      ];

      if (filter.$or) {
        // Merge with existing $or (from search)
        filter.$and = [
          { $or: filter.$or },
          { $or: dateConditions },
        ];
        delete filter.$or;
      } else {
        filter.$or = dateConditions;
      }
    }

    // ── Build sort ───────────────────────────────────────────────────────────
    // Use createdAt — it exists on ALL records (old and new)
    const sortField =
      sortBy === "amount" ? "total" :
      sortBy === "name"   ? "customerName" :
                            "createdAt";
    const sort: Record<string, 1 | -1> = {
      [sortField]: sortOrder === "asc" ? 1 : -1,
    };

    const collection = MONGODB.collection("payments");

    // ── Paginated results + total count ──────────────────────────────────────
    const [payments, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    // ── Stats (completed only, within same date/search filter) ───────────────
    const statsFilter = { ...filter, status: "completed" };
    // Remove status override so we apply the completed filter correctly
    const allCompleted = await collection.find(statsFilter).toArray();

    const totalSales = allCompleted.reduce((s, t) => s + (t.total || 0), 0);
    const cashSales  = allCompleted.filter(t => t.paymentMethod === "cash") .reduce((s, t) => s + (t.total || 0), 0);
    const gcashSales = allCompleted.filter(t => t.paymentMethod === "gcash").reduce((s, t) => s + (t.total || 0), 0);
    const splitSales = allCompleted.filter(t => t.paymentMethod === "split").reduce((s, t) => s + (t.total || 0), 0);

    const stats = {
      totalSales,
      totalTransactions: allCompleted.length,
      averageTransaction: allCompleted.length ? totalSales / allCompleted.length : 0,
      cashSales,
      gcashSales,
      splitSales,
    };

    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Payment fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}