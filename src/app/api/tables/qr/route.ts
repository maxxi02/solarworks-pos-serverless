// src/app/api/tables/qr/route.ts
// Generate QR codes for walk-in / drive-thru (no table)

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrType } = body; // "walk-in" | "drive-thru"

    if (!qrType || !["walk-in", "drive-thru", "take-away"].includes(qrType)) {
      return NextResponse.json(
        { error: "qrType must be 'walk-in', 'drive-thru', or 'take-away'" },
        { status: 400 },
      );
    }

    const customerPortalUrl =
      process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "http://localhost:3001";
    const qrCodeUrl = `${customerPortalUrl}/order?type=${qrType}`;

    const labelMap: Record<string, string> = {
      "walk-in": "Walk-In Order",
      "drive-thru": "Drive-Thru Order",
      "take-away": "Take-Away Order",
    };

    return NextResponse.json({
      qrType,
      qrCodeUrl,
      label: labelMap[qrType as keyof typeof labelMap] || "Order",
    });
  } catch (error: unknown) {
    console.error("❌ QR Generation Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate QR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
