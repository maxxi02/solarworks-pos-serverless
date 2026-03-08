import { NextResponse } from "next/server";
import { MONGODB } from "@/config/db";

export async function GET() {
  try {
    const collection = MONGODB.collection("inventory");

    const stats = await collection
      .aggregate([
        {
          $facet: {
            metrics: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  value: {
                    $sum: {
                      $multiply: [
                        "$currentStock",
                        { $ifNull: ["$pricePerUnit", 0] },
                      ],
                    },
                  },
                  needRestock: {
                    $sum: {
                      $cond: [
                        { $lte: ["$currentStock", "$reorderPoint"] },
                        1,
                        0,
                      ],
                    },
                  },
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
            lowStockAlerts: [
              { $match: { status: { $in: ["low", "warning", "critical"] } } },
              { $limit: 20 },
              {
                $project: {
                  _id: 0,
                  itemId: { $toString: "$_id" },
                  name: 1,
                  status: 1,
                  currentStock: 1,
                  minStock: 1,
                  reorderPoint: 1,
                },
              },
            ],
          },
        },
      ])
      .toArray();

    const data = stats[0].metrics[0] || {
      total: 0,
      value: 0,
      needRestock: 0,
      critical: 0,
      low: 0,
      warning: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total: data.total,
          value: data.value,
          needRestock: data.needRestock,
          critical: data.critical,
          low: data.low,
          warning: data.warning,
        },
        lowStock: stats[0].lowStockAlerts,
      },
    });
  } catch (error) {
    console.error("Inventory summary error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory summary" },
      { status: 500 },
    );
  }
}
