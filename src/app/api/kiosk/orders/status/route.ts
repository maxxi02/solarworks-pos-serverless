import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  try {
    const order = await MONGODB.collection("orders").findOne(
      { orderId },
      { projection: { orderId: 1, queueStatus: 1, orderNumber: 1 } },
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      queueStatus: order.queueStatus,
    });
  } catch (err) {
    console.error("❌ Kiosk status check error:", err);
    return NextResponse.json({ error: "Failed to check order status" }, { status: 500 });
  }
}
