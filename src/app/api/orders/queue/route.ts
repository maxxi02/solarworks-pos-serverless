// src/app/api/orders/queue/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";

// GET orders by queue status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusesParam = searchParams.get("statuses");
    const statuses = statusesParam
      ? statusesParam.split(",")
      : ["paid", "preparing", "ready", "served"];

    const orders = await MONGODB.collection("orders")
      .find({ queueStatus: { $in: statuses } })
      .sort({ createdAt: 1 })
      .toArray();

    const formatted = orders.map((o) => ({
      ...o,
      _id: o._id.toString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("❌ GET Queue Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch queue",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// PATCH update queue status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, queueStatus } = body;

    if (!orderId || !queueStatus) {
      return NextResponse.json(
        { error: "orderId and queueStatus are required" },
        { status: 400 },
      );
    }

    const validStatuses = [
      "pending_payment",
      "paid",
      "preparing",
      "ready",
      "served",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(queueStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const timestampMap: Record<string, string> = {
      paid: "paidAt",
      preparing: "preparingAt",
      ready: "readyAt",
      served: "servedAt",
      completed: "completedAt",
      cancelled: "cancelledAt",
    };

    const updateData: Record<string, unknown> = {
      queueStatus,
      updatedAt: new Date(),
    };

    const timestampField = timestampMap[queueStatus];
    if (timestampField) {
      updateData[timestampField] = new Date();
    }

    if (queueStatus === "paid") {
      updateData.paymentStatus = "paid";
    }

    const result = await MONGODB.collection("orders").findOneAndUpdate(
      { orderId },
      { $set: updateData },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      _id: result._id.toString(),
    });
  } catch (error: unknown) {
    console.error("❌ PATCH Queue Error:", error);
    return NextResponse.json(
      {
        error: "Failed to update queue status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
