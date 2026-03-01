// src/app/api/tables/qr/route.ts
// Generate QR codes for walk-in / drive-thru (no table)

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrType } = body; // "walk-in" | "drive-thru"

    if (!qrType || !["walk-in", "drive-thru"].includes(qrType)) {
      return NextResponse.json(
        { error: "qrType must be 'walk-in' or 'drive-thru'" },
        { status: 400 },
      );
    }

    const customerPortalUrl =
      process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "http://localhost:3001";
    const qrCodeUrl = `${customerPortalUrl}/order?type=${qrType}`;

    return NextResponse.json({
      qrType,
      qrCodeUrl,
      label: qrType === "walk-in" ? "Walk-In Order" : "Drive-Thru Order",
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
