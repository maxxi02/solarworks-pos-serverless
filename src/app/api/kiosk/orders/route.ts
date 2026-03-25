import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

function generateOrderNumber() {
  const d = new Date();
  return `ORD-${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}-${Math.floor(
    Math.random() * 1000,
  )
    .toString()
    .padStart(3, "0")}`;
}

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
  } catch {
    /* non-critical */
  }
}

export async function POST(req: NextRequest) {
  try {
    const { success: allowed, response: limitResponse } = rateLimit(req, LIMITS.kioskOrder);
    if (!allowed) return limitResponse!;

    const body = await req.json();
    const {
      customerName,
      items,
      subtotal,
      total,
      paymentMethod, // "cash" | "qrph"
      orderType,     // "dine-in" | "takeaway"
      tableNumber,
      orderNote,
      paymongoSourceId,
    } = body;

    if (!items || items.length === 0 || !total) {
      return NextResponse.json(
        { error: "items and total are required" },
        { status: 400 },
      );
    }

    const orderId = `kiosk-${Date.now()}`;
    const orderNumber = generateOrderNumber();
    const now = new Date();

    // Cash = immediately in queue; QR PH = pending payment
    const queueStatus = paymentMethod === "cash" ? "queueing" : "pending_payment";

    const order = {
      orderId,
      orderNumber,
      customerName: customerName || "Kiosk Order",
      items,
      subtotal: subtotal || total,
      discountTotal: 0,
      total,
      paymentMethod,
      orderType: orderType || "dine-in",
      tableNumber: tableNumber || null,
      orderNote: orderNote || null,
      queueStatus,
      source: "kiosk",
      sessionId: null,
      paymongoSourceId: paymongoSourceId || null,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
      ...(queueStatus === "queueing" ? { queueingAt: now, paidAt: now } : {}),
    };

    await MONGODB.collection("orders").insertOne(order);

    // Notify socket server → QueueBoard updates
    await notifyQueue(orderId, queueStatus, order);

    return NextResponse.json({ success: true, orderId, orderNumber, queueStatus });
  } catch (err) {
    console.error("❌ Kiosk order error:", err);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
