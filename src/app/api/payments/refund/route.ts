// POST /api/payments/refund
// Staff refunds a completed transaction.
// - Sets status = "refunded", stores refundedAt, refundedBy, refundReason
// - Stats already exclude non-completed records so earnings are auto-deducted

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
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
        { success: false, message: "Invalid Admin PIN. Only administrators can authorize refunds." },
        { status: 403 },
      );
    }

    const col = MONGODB.collection("payments");

    // Only allow refunding completed transactions
    const existing = await col.findOne({ _id: new ObjectId(transactionId) });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 });
    }
    if (existing.status === "refunded") {
      return NextResponse.json({ success: false, message: "Transaction is already refunded" }, { status: 400 });
    }
    if (existing.status !== "completed") {
      return NextResponse.json(
        { success: false, message: "Only completed transactions can be refunded" },
        { status: 400 },
      );
    }

    await col.updateOne(
      { _id: new ObjectId(transactionId) },
      {
        $set: {
          status: "refunded",
          refundedAt: new Date(),
          refundedBy: session.user.name || session.user.email,
          refundedById: session.user.id,
          refundReason: reason?.trim() || "No reason provided",
          updatedAt: new Date(),
        },
      },
    );

    notifySalesUpdate();

    return NextResponse.json({
      success: true,
      message: `Transaction ${existing.orderNumber} has been refunded`,
      orderNumber: existing.orderNumber,
      amount: existing.total,
    });
  } catch (error) {
    console.error("Refund transaction error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
