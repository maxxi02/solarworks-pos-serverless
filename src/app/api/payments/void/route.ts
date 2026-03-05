// POST /api/payments/void
// Staff voids a completed transaction.
// - Sets status = "voided", stores voidedAt, voidedBy, voidReason
// - Stats already exclude non-completed records so earnings are auto-deducted

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import MONGODB from "@/config/db";
import { ObjectId } from "mongodb";

const notifySalesUpdate = async () => {
  try {
    await fetch(`${process.env.SOCKET_URL}/internal/sales-updated`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.BETTER_AUTH_SECRET || "",
      },
    });
  } catch {
    // Non-critical, swallow
  }
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { transactionId, reason, adminPin } = await req.json() as {
      transactionId?: string;
      reason?: string;
      adminPin?: string;
    };

    if (!transactionId || !adminPin) {
      return NextResponse.json(
        { success: false, message: "transactionId and adminPin are required" },
        { status: 400 },
      );
    }

    const usersCol = MONGODB.collection("user");
    // Find any admin that has this PIN
    const adminWithPin = await usersCol.findOne({
      role: "admin",
      attendancePin: adminPin,
    });

    if (!adminWithPin) {
      return NextResponse.json(
        { success: false, message: "Invalid Admin PIN. Only administrators can authorize voids." },
        { status: 403 },
      );
    }

    const col = MONGODB.collection("payments");

    // Only allow voiding completed transactions
    const existing = await col.findOne({ _id: new ObjectId(transactionId) });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 });
    }
    if (existing.status === "voided") {
      return NextResponse.json({ success: false, message: "Transaction is already voided" }, { status: 400 });
    }
    if (existing.status !== "completed") {
      return NextResponse.json(
        { success: false, message: "Only completed transactions can be voided" },
        { status: 400 },
      );
    }

    await col.updateOne(
      { _id: new ObjectId(transactionId) },
      {
        $set: {
          status: "voided",
          voidedAt: new Date(),
          voidedBy: session.user.name || session.user.email,
          voidedById: session.user.id,
          voidReason: reason?.trim() || "No reason provided",
          updatedAt: new Date(),
        },
      },
    );

    notifySalesUpdate();

    return NextResponse.json({
      success: true,
      message: `Transaction ${existing.orderNumber} has been voided`,
      orderNumber: existing.orderNumber,
      amount: existing.total,
    });
  } catch (error) {
    console.error("Void transaction error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
