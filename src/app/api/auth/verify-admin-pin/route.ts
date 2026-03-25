import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { success: allowed, response: limitResponse } = rateLimit(req, LIMITS.adminPin, session.user.id);
    if (!allowed) return limitResponse!;

    const { pin } = await req.json() as { pin?: string };

    if (!pin) {
      return NextResponse.json(
        { success: false, message: "PIN is required" },
        { status: 400 },
      );
    }

    const usersCol = MONGODB.collection("user");
    // Find any admin that has this PIN
    const adminWithPin = await usersCol.findOne({
      role: "admin",
      attendancePin: pin,
    });

    if (!adminWithPin) {
      return NextResponse.json(
        { success: false, message: "Invalid Admin PIN. Authorization failed." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin PIN verified",
      adminName: adminWithPin.name,
    });
  } catch (error) {
    console.error("Verify admin PIN error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
