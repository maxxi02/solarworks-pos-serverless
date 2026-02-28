import { NextResponse } from "next/server";
import MONGODB from "@/config/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week"; // today, week, month, year, all
    const staffId = searchParams.get("staffId");

    // Date filter
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case "all":
        startDate = new Date(0); // 1970-01-01
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    console.log(
      `Fetching payments from ${startDate} to ${new Date()} ${staffId ? `for staff ${staffId}` : ""}`,
    );

    const collection = MONGODB.collection("payments");

    // FIX: Use $match with proper date comparison and optional staffId
    const matchStage = {
      $match: {
        createdAt: { $gte: startDate },
        ...(staffId && { cashierId: staffId }),
      },
    };

    // Log para debugging
    const count = await collection.countDocuments({
      createdAt: { $gte: startDate },
    });
    console.log(`Found ${count} payments in date range`);

    // RUN ALL QUERIES IN PARALLEL
    const [
      summaryResult,
      dailyResult,
      productsResult,
      methodsResult,
      recentResult,
    ] = await Promise.all([
      // 1. Overall summary
      collection
        .aggregate([
          matchStage,
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$total" },
              totalTransactions: { $sum: 1 },
              avgOrderValue: { $avg: "$total" },
            },
          },
        ])
        .toArray(),

      // 2. Daily sales breakdown
      collection
        .aggregate([
          matchStage,
          {
            $group: {
              _id: {
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                  },
                },
              },
              revenue: { $sum: "$total" },
              transactions: { $sum: 1 },
            },
          },
          { $sort: { "_id.date": 1 } },
          {
            $project: {
              _id: 0,
              date: "$_id.date",
              revenue: 1,
              transactions: 1,
            },
          },
        ])
        .toArray(),

      // 3. Top products
      collection
        .aggregate([
          matchStage,
          { $unwind: "$items" },
          {
            $group: {
              _id: {
                name: "$items.name",
                category: "$items.category",
              },
              quantity: { $sum: "$items.quantity" },
              revenue: { $sum: "$items.revenue" },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
          {
            $project: {
              _id: 0,
              name: "$_id.name",
              category: "$_id.category",
              quantity: 1,
              revenue: { $round: ["$revenue", 2] },
            },
          },
        ])
        .toArray(),

      // 4. Payment methods breakdown - FIXED: Keep _id field
      collection
        .aggregate([
          matchStage,
          {
            $group: {
              _id: "$paymentMethod",
              total: { $sum: "$total" },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 1, // Keep _id para magamit sa frontend
              total: { $round: ["$total", 2] },
              count: 1,
            },
          },
        ])
        .toArray(),

      // 5. Recent transactions
      collection
        .aggregate([
          matchStage,
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $project: {
              _id: 1,
              orderNumber: 1,
              customerName: 1,
              total: 1,
              paymentMethod: 1,
              orderType: 1,
              createdAt: 1,
              itemsCount: { $size: "$items" },
            },
          },
        ])
        .toArray(),
    ]);

    // Format the response
    const summary = summaryResult[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      avgOrderValue: 0,
    };

    console.log("Payment methods data:", methodsResult); // Debug log

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: {
          from: startDate,
          to: new Date(),
        },
        summary: {
          totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
          totalTransactions: summary.totalTransactions,
          avgOrderValue: Math.round(summary.avgOrderValue * 100) / 100,
        },
        daily: dailyResult.map((d) => ({
          ...d,
          revenue: Math.round(d.revenue * 100) / 100,
        })),
        topProducts: productsResult,
        paymentMethods: methodsResult, // Now has _id field
        recentTransactions: recentResult,
        totalCount: summary.totalTransactions,
      },
    });
  } catch (error) {
    console.error("Summary API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
