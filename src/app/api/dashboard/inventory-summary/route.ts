import { NextResponse } from "next/server";
import { MONGODB } from "@/config/db";

export async function GET() {
  try {
    const db = MONGODB;
    const collection = db.collection("inventory");

    // Unified aggregation for all dashboard inventory needs
    const results = await collection
      .aggregate([
        {
          $facet: {
            // 1. Overall counts and values
            stats: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  value: { $sum: { $multiply: ["$price", "$stock"] } },
                  critical: {
                    $sum: { $cond: [{ $eq: ["$status", "critical"] }, 1, 0] },
                  },
                  low: { $sum: { $cond: [{ $eq: ["$status", "low"] }, 1, 0] } },
                  warning: {
                    $sum: { $cond: [{ $eq: ["$status", "warning"] }, 1, 0] },
                  },
                },
              },
            ],
            // 2. Need restock count
            needRestock: [
              {
                $match: {
                  $or: [{ status: "critical" }, { status: "low" }],
                },
              },
              { $count: "count" },
            ],
            // 3. Low stock items list for alerts
            lowStockItems: [
              {
                $match: {
                  $or: [
                    { status: "critical" },
                    { status: "low" },
                    { status: "warning" },
                  ],
                },
              },
              { $sort: { status: 1, stock: 1 } },
              { $limit: 10 },
              {
                $project: {
                  _id: 0,
                  itemId: { $toString: "$_id" },
                  name: 1,
                  status: 1,
                  stock: 1,
                  minStock: 1,
                  category: 1,
                },
              },
            ],
          },
        },
      ])
      .toArray();

    const data = results[0];
    const stats = data.stats[0] || {
      total: 0,
      value: 0,
      critical: 0,
      low: 0,
      warning: 0,
    };
    const needRestock = data.needRestock[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total: stats.total,
          value: Math.round(stats.value * 100) / 100,
          critical: stats.critical,
          low: stats.low,
          warning: stats.warning,
          needRestock,
        },
        lowStock: data.lowStockItems,
      },
    });
  } catch (error) {
    console.error("Inventory summary API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory summary" },
      { status: 500 },
    );
  }
}
