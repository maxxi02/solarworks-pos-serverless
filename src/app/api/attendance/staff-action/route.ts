import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { AttendanceModel } from "@/models/attendance.model";
import { ObjectId } from "mongodb";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";

const scryptAsync = promisify(scrypt);

// Verifies a better-auth password hash (bcrypt or scrypt)
async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
      return await bcrypt.compare(password, hash);
    }
    const [salt, key] = hash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const keyLen = keyBuffer.length; // Either 32 or 64
    const derived = (await scryptAsync(password, salt, keyLen)) as Buffer;
    return timingSafeEqual(keyBuffer, derived);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Require an active session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse body — accept staffId + (pin OR password) + action
    const body = await req.json() as {
      staffId?: string;
      pin?: string;
      password?: string;
      action?: "clock-in" | "clock-out";
    };

    const { staffId, pin, password, action } = body;

    if (!staffId || !action || (!pin && !password)) {
      return NextResponse.json(
        { success: false, message: "staffId, action, and pin or password are required" },
        { status: 400 },
      );
    }
    if (action !== "clock-in" && action !== "clock-out") {
      return NextResponse.json(
        { success: false, message: "action must be 'clock-in' or 'clock-out'" },
        { status: 400 },
      );
    }

    // 3. Find the staff member by ID
    let objId = null;
    try { objId = new ObjectId(staffId); } catch { }

    const usersCol = MONGODB.collection("user");
    const targetUser = await usersCol.findOne(
      { _id: { $in: objId ? [staffId, objId] : [staffId] } },
      { projection: { _id: 1, name: 1, email: 1, role: 1, attendancePin: 1 } },
    );

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 404 },
      );
    }

    // 4. Verify credential: PIN first, fall back to password
    let verified = false;

    if (pin) {
      // PIN mode: compare directly (stored as plain string)
      if (!targetUser.attendancePin) {
        return NextResponse.json(
          { success: false, message: "This staff has no PIN set. Please use password instead." },
          { status: 400 },
        );
      }
      verified = targetUser.attendancePin === pin;
    } else if (password) {
      // Password mode: use better-auth scrypt verifier
      const accountsCol = MONGODB.collection("account");
      const account = await accountsCol.findOne({
        userId: { $in: [targetUser._id, targetUser._id.toString()] },
        providerId: "credential",
      });
      if (!account?.password) {
        console.log("staff-action: No password account found for this staff", staffId);
        return NextResponse.json(
          { success: false, message: `No password account found for staffId=${staffId}, user._id=${targetUser._id}` },
          { status: 401 },
        );
      }
      try {
        verified = await verifyPassword(account.password, password);
      } catch (err: any) {
        return NextResponse.json({ success: false, message: "verify error: " + err.message }, { status: 500 });
      }
    }

    if (!verified) {
      console.log("staff-action: Incorrect PIN or password for staff", staffId);
      return NextResponse.json(
        { success: false, message: "The password provided does not match the database." },
        { status: 401 },
      );
    }

    const userId = targetUser._id.toString();
    const userName = targetUser.name as string;

    // 5. Clock in or clock out
    if (action === "clock-in") {
      const attendance = await AttendanceModel.clockIn(userId);
      if (!attendance) {
        return NextResponse.json({
          success: false,
          message: "Already clocked in for this shift",
          alreadyClockedIn: true,
        });
      }
      return NextResponse.json({
        success: true,
        message: `${userName} clocked in successfully`,
        attendance,
        isClockedIn: true,
      });
    } else {
      const attendance = await AttendanceModel.clockOut(userId);
      if (!attendance) {
        return NextResponse.json({
          success: false,
          message: "Not clocked in or already clocked out",
        });
      }
      return NextResponse.json({
        success: true,
        message: `${userName} clocked out. Hours worked: ${attendance.hoursWorked?.toFixed(2)}h`,
        attendance,
        hoursWorked: attendance.hoursWorked,
        isClockedIn: false,
      });
    }
  } catch (error) {
    console.error("Staff-action error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

// GET: status + hasPin by staffId
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const staffId = new URL(req.url).searchParams.get("staffId");
    if (!staffId) {
      return NextResponse.json({ success: false, message: "staffId is required" }, { status: 400 });
    }

    let objId = null;
    try { objId = new ObjectId(staffId); } catch { }

    const usersCol = MONGODB.collection("user");
    const targetUser = await usersCol.findOne(
      { _id: { $in: objId ? [staffId, objId] : [staffId] } },
      { projection: { _id: 1, name: 1, attendancePin: 1 } },
    );

    if (!targetUser) {
      return NextResponse.json({ success: true, found: false, isClockedIn: false, hasPin: false });
    }

    const attendance = await AttendanceModel.getTodayAttendance(targetUser._id.toString());

    return NextResponse.json({
      success: true,
      found: true,
      name: targetUser.name,
      hasPin: !!(targetUser.attendancePin),
      isClockedIn: !!attendance && !attendance.clockOutTime,
      attendance,
    });
  } catch (error) {
    console.error("Staff-action GET error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
