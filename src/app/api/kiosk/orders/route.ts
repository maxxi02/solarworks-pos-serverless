import { NextRequest, NextResponse } from "next/server";
import { CLIENT, MONGODB } from "@/config/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { CreateKioskOrderSchema } from "@/lib/validators";

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
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_URL;
    if (!socketUrl) return;
    await fetch(
      `${socketUrl}/internal/queue-updated`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_SECRET || process.env.BETTER_AUTH_SECRET || "",
        },
        body: JSON.stringify({ orderId, queueStatus, order }),
      },
    );
  } catch {
    /* non-critical */
  }
}

export async function POST(req: NextRequest) {
  const session = CLIENT.startSession();
  let responseBody: any = { success: false, error: "Failed to create order" };
  let responseStatus = 500;

  try {
    const { success: allowed, response: limitResponse } = rateLimit(req, LIMITS.kioskOrder);
    if (!allowed) return limitResponse!;

    const body = await req.json();
    const parsed = CreateKioskOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid order data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const {
      customerName,
      items,
      subtotal,
      total,
      paymentMethod,
      orderType,
      tableNumber,
      orderNote,
      paymongoSourceId,
    } = parsed.data;

    const orderId = `kiosk-${Date.now()}`;
    const orderNumber = generateOrderNumber();
    const now = new Date();

    // Cash = immediately in queue; QR PH = pending payment
    const queueStatus = paymentMethod === "cash" ? "queueing" : "pending_payment";

    const order = {
      orderId,
      orderNumber,
      customerName,
      items,
      subtotal,
      discountTotal: 0,
      total,
      paymentMethod,
      orderType,
      tableNumber,
      orderNote,
      queueStatus,
      source: "kiosk",
      sessionId: null,
      paymongoSourceId,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
      ...(queueStatus === "queueing" ? { queueingAt: now, paidAt: now } : {}),
    };

    await session.withTransaction(async () => {
      const ordersCollection = MONGODB.collection("orders");
      await ordersCollection.insertOne(order, { session });

      // Atomic inventory deduction logic could go here in Fix #4
      // We wrap the order creation in a transaction to ensure it's recorded correctly.

      console.log("Kiosk order created:", orderNumber);
      responseBody = { success: true, orderId, orderNumber, queueStatus };
      responseStatus = 200;
    });

    // Notify socket server → QueueBoard updates (outside transaction)
    await notifyQueue(orderId, queueStatus, order);

    return NextResponse.json(responseBody, { status: responseStatus });

  } catch (err) {
    console.error("❌ Kiosk order error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: responseStatus },
    );
  } finally {
    await session.endSession();
  }
}
