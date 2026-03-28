// src/app/api/orders/queue/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";
import { requireAuth } from "@/lib/api-auth";

import { UpdateOrderStatusSchema } from "@/lib/validators";

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
    const auth = await requireAuth(request, ["admin", "staff"]);
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(request.url);
    const statusesParam = searchParams.get("statuses");
    let statuses = statusesParam
      ? statusesParam.split(",")
      : ["queueing", "serving"];
    
    // Quick validation for statuses
    statuses = statuses.filter(s => VALID_STATUSES.includes(s));

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
    const auth = await requireAuth(request, ["admin", "staff"]);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const parsed = UpdateOrderStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { orderId, queueStatus } = parsed.data;

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

    // ── When marked "done", auto-save into the payments collection ──
    if (queueStatus === "done") {
      try {
        const paymentsCollection = MONGODB.collection("payments");
        const existing = await paymentsCollection.findOne({ orderId: result.orderId });
        if (!existing) {
          await paymentsCollection.insertOne({
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            customerName: result.customerName,
            cashier: "QR Order",
            items: result.items || [],
            subtotal: result.subtotal || result.total,
            discount: 0,
            discountTotal: 0,
            total: result.total,
            paymentMethod: result.paymentMethod || "gcash",
            splitPayment: result.splitPayment || null,
            paymentReference: result.paymentReference || null,
            amountPaid: result.total,
            change: 0,
            status: "completed",
            orderType: result.orderType || "dine-in",
            tableNumber: result.tableNumber || null,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            source: "qr_order",
          });
          console.log(`✅ Payment record created for QR order: ${result.orderId}`);
        }
      } catch (payErr) {
        console.error("⚠️ Failed to save payment record:", payErr);
      }

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
