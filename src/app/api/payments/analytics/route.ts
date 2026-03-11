import { NextResponse } from "next/server";
import MONGODB from "@/config/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week";
    const staffId = searchParams.get("staffId");

    // ── Date range calculation ────────────────────────────────────────────────
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let periodStart: Date;
    switch (period) {
      case "today":
        periodStart = todayStart;
        break;
      case "week":
        periodStart = new Date(todayStart.getTime() - 7 * 86_400_000);
        break;
      case "month":
        periodStart = new Date(todayStart.getTime() - 30 * 86_400_000);
        break;
      case "year":
        periodStart = new Date(todayStart.getFullYear() - 1, todayStart.getMonth(), todayStart.getDate());
        break;
      case "all":
        periodStart = new Date(0); // Epoch
        break;
      default:
        periodStart = new Date(todayStart.getTime() - 7 * 86_400_000);
    }

    const collection = MONGODB.collection("payments");

    // ── Aggregation Pipeline ──────────────────────────────────────────────────
    const [result] = await collection
      .aggregate([
        {
          $match: {
            createdAt: { $gte: periodStart },
            status: "completed",
            ...(staffId ? { cashierId: staffId } : {}),
          },
        },
        {
          $facet: {
            // Overall summary stats
            summary: [
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$total" },
                  totalTransactions: { $sum: 1 },
                },
              },
              {
                $project: {
                  _id: 0,
                  totalRevenue: 1,
                  totalTransactions: 1,
                  avgOrderValue: {
                    $cond: [
                      { $gt: ["$totalTransactions", 0] },
                      { $divide: ["$totalRevenue", "$totalTransactions"] },
                      0,
                    ],
                  },
                },
              },
            ],
            // Daily trends
            daily: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$createdAt",
                      timezone: "Asia/Manila",
                    },
                  },
                  revenue: { $sum: "$total" },
                  transactions: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
              {
                $project: {
                  _id: 0,
                  date: "$_id",
                  revenue: 1,
                  transactions: 1,
                },
              },
            ],
            // Top selling products
            topProducts: [
              { $unwind: "$items" },
              {
                $group: {
                  _id: "$items.name",
                  category: { $first: "$items.category" },
                  quantity: { $sum: { $ifNull: ["$items.quantity", 1] } },
                  revenue: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ["$items.price", 0] },
                        { $ifNull: ["$items.quantity", 1] },
                      ],
                    },
                  },
                },
              },
              { $sort: { revenue: -1 } },
              { $limit: 10 },
              {
                $project: {
                  _id: 0,
                  name: "$_id",
                  category: 1,
                  quantity: 1,
                  revenue: 1,
                },
              },
            ],
            // Payment method breakdown
            paymentMethods: [
              {
                $group: {
                  _id: "$paymentMethod",
                  total: { $sum: "$total" },
                  count: { $sum: 1 },
                },
              },
              { $sort: { total: -1 } },
            ],
            // Recent transactions
            recentTransactions: [
              { $sort: { createdAt: -1 } },
              { $limit: 10 },
              {
                $project: {
                  _id: { $toString: "$_id" },
                  orderNumber: 1,
                  createdAt: 1,
                  customerName: 1,
                  items: 1,
                  itemsCount: {
                    $cond: [
                      { $isArray: "$items" },
                      { $sum: "$items.quantity" },
                      { $ifNull: ["$itemsCount", 0] },
                    ],
                  },
                  total: 1,
                  paymentMethod: 1,
                  orderType: 1,
                },
              },
            ],
            // Total count for current filter
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    // ── Reshape response ──────────────────────────────────────────────────────
    const summary = result.summary?.[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      avgOrderValue: 0,
    };

    const formattedData = {
      period,
      dateRange: {
        from: periodStart.toISOString(),
        to: now.toISOString(),
      },
      summary,
      daily: result.daily || [],
      topProducts: result.topProducts || [],
      paymentMethods: result.paymentMethods || [],
      recentTransactions: result.recentTransactions || [],
      totalCount: result.totalCount?.[0]?.count || 0,
    };

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("Sales Analytics API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sales analytics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
