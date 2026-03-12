// src/app/api/shop-status/route.ts
// GET  — returns current shop open/closed state (public, used by customer portal)
// POST — sets shop state (server-side only, protected by internal secret)
// PATCH — sets shop state (client-side, no internal secret needed)

import { NextRequest, NextResponse } from "next/server";
import { ShopStatusModel } from "@/models/shopStatus.model";
import { notifyShopStatus } from "@/lib/notifyServer";

export async function GET() {
  try {
    const status = await ShopStatusModel.getStatus();
    return NextResponse.json({ success: true, isOpen: status.isOpen, updatedAt: status.updatedAt });
  } catch (error) {
    console.error("[shop-status] GET error:", error);
    // Default to open on error so we don't accidentally block customers
    return NextResponse.json({ success: true, isOpen: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Protect with shared internal secret (called from notifyServer / other internal code)
    const secret = request.headers.get("x-internal-secret");
    if (process.env.INTERNAL_SECRET && secret !== process.env.INTERNAL_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { isOpen, updatedBy } = body;

    if (typeof isOpen !== "boolean") {
      return NextResponse.json({ error: "isOpen must be a boolean" }, { status: 400 });
    }

    const status = await ShopStatusModel.setStatus(isOpen, updatedBy);
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    console.error("[shop-status] POST error:", error);
    return NextResponse.json({ error: "Failed to update shop status" }, { status: 500 });
  }
}

// PATCH — called from the POS orders page client-side (no internal secret needed)
// Used to sync shop status when the register is opened or when it needs to be opened.
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { isOpen, updatedBy } = body;

    if (typeof isOpen !== "boolean") {
      return NextResponse.json({ error: "isOpen must be a boolean" }, { status: 400 });
    }

    // Persist the new status
    const status = await ShopStatusModel.setStatus(isOpen, updatedBy);

    // Broadcast to socket server so all clients (customer portal, POS) update in real-time
    notifyShopStatus(isOpen, updatedBy); // fire-and-forget

    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    console.error("[shop-status] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update shop status" }, { status: 500 });
  }
}
