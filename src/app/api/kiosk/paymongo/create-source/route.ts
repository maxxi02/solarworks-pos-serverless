import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { amount, orderId, orderNumber, description } = await req.json();

    if (!amount || !orderId) {
      return NextResponse.json(
        { error: "amount and orderId are required" },
        { status: 400 },
      );
    }

    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "PayMongo not configured" },
        { status: 503 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rendezvous-pos.vercel.app";

    const payload = {
      data: {
        attributes: {
          amount: Math.round(amount * 100), // PayMongo uses centavos
          currency: "PHP",
          type: "qrph",
          description: description || `Order ${orderNumber}`,
          redirect: {
            success: `${baseUrl}/kiosk?payment=success&orderId=${orderId}`,
            failed: `${baseUrl}/kiosk?payment=failed&orderId=${orderId}`,
          },
          metadata: {
            orderId,
            orderNumber: orderNumber || "",
          },
        },
      },
    };

    const res = await fetch("https://api.paymongo.com/v1/sources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("PayMongo error:", err);
      return NextResponse.json(
        { error: err?.errors?.[0]?.detail || "PayMongo request failed" },
        { status: res.status },
      );
    }

    const data = await res.json();
    const source = data.data;

    return NextResponse.json({
      success: true,
      sourceId: source.id,
      // QR PH provides a data URL or URL to the QR image
      qrCode: source.attributes?.qr_code || null,
    });
  } catch (err) {
    console.error("❌ Create PayMongo source error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
