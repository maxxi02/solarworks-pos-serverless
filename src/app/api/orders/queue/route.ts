// src/app/api/orders/queue/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";

const VALID_STATUSES = [
  "pending_payment",
  "queueing",
  "preparing",
  "serving",
  "done",
  "cancelled",
];

const TIMESTAMP_MAP: Record<string, string> = {
  queueing: "queueingAt",
  preparing: "preparingAt",
  serving: "servingAt",
  done: "doneAt",
  cancelled: "cancelledAt",
};

// GET orders by queue status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusesParam = searchParams.get("statuses");
    const statuses = statusesParam
      ? statusesParam.split(",")
      : ["queueing", "serving"];

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

    if (!VALID_STATUSES.includes(queueStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {
      queueStatus,
      updatedAt: new Date(),
    };

    const timestampField = TIMESTAMP_MAP[queueStatus];
    if (timestampField) {
      updateData[timestampField] = new Date();
    }

    const result = await MONGODB.collection("orders").findOneAndUpdate(
      { orderId },
      { $set: updateData },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ── When marked "done", notify socket server to refresh the sales dashboard ──
    // NOTE: Portal/QR orders are already surfaced in GET /api/payments by reading
    // the orders collection directly (paymentStatus: "paid"). Inserting them into
    // the payments collection here would create duplicates in transaction history.
    if (queueStatus === "done") {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_SOCKET_URL}/internal/sales-updated`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": process.env.INTERNAL_SECRET || "",
            },
          },
        );
      } catch {
        /* non-critical */
      }
    }

    // Notify socket server to update the customer's waiting page
    try {
      if (result.sessionId) {
        await fetch(
          `${process.env.NEXT_PUBLIC_SOCKET_URL}/internal/order-status-changed`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": process.env.INTERNAL_SECRET || "",
            },
            body: JSON.stringify({
              orderId: result.orderId,
              orderNumber: result.orderNumber,
              queueStatus: result.queueStatus,
              sessionId: result.sessionId,
            }),
          },
        );
      }
    } catch (err) {
      console.warn(
        "Could not notify socket server about order status change:",
        err,
      );
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
