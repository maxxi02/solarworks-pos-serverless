import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";

async function notifyQueue(orderId: string, queueStatus: string, order: Record<string, unknown>) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SOCKET_URL}/internal/queue-updated`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_SECRET || "",
        },
        body: JSON.stringify({ orderId, queueStatus, order }),
      },
    );
  } catch { /* non-critical */ }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const eventType = body?.data?.attributes?.type;
    const resource = body?.data?.attributes?.data;

    // Only process payment.paid events
    if (eventType !== "payment.paid") {
      return NextResponse.json({ received: true });
    }

    const sourceId = resource?.attributes?.source?.id;
    if (!sourceId) {
      return NextResponse.json({ received: true });
    }

    // Find the order by paymongoSourceId
    const order = await MONGODB.collection("orders").findOne({ paymongoSourceId: sourceId });
    if (!order) {
      console.warn(`⚠️ No order found for PayMongo source: ${sourceId}`);
      return NextResponse.json({ received: true });
    }

    const now = new Date();

    // Update to queueing (payment confirmed)
    await MONGODB.collection("orders").updateOne(
      { orderId: order.orderId },
      {
        $set: {
          queueStatus: "queueing",
          paidAt: now,
          queueingAt: now,
          updatedAt: now,
          paymentReference: resource?.id || null,
        },
      },
    );

    const updatedOrder = { ...order, queueStatus: "queueing", paidAt: now, queueingAt: now };

    // Notify socket → QueueBoard updates
    await notifyQueue(order.orderId, "queueing", updatedOrder);

    return NextResponse.json({ received: true, orderId: order.orderId });
  } catch (err) {
    console.error("❌ PayMongo webhook error:", err);
    // Always return 200 to PayMongo so it doesn't retry excessively
    return NextResponse.json({ received: true });
  }
}
