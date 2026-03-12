import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { AttendanceModel } from "@/models/attendance.model";
import { ShopStatusModel } from "@/models/shopStatus.model";
import { notifyShopStatus } from "@/lib/notifyServer";
import { ObjectId } from "mongodb";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";

const scryptAsync = promisify(scrypt);

async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
      return await bcrypt.compare(password, hash);
    }
    const [salt, key] = hash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const keyLen = keyBuffer.length;
    const derived = (await scryptAsync(password, salt, keyLen)) as Buffer;
    return timingSafeEqual(keyBuffer, derived);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      staffId?: string;
      pin?: string;
      password?: string;
      action?: "clock-in" | "clock-out";
    };

    const { staffId, pin, password, action } = body;
    console.log(`[staff-action] Action: ${action}, StaffId: ${staffId}, Method: ${pin ? 'PIN' : 'Password'}`);

    if (!staffId || !action || (!pin && !password)) {
      return NextResponse.json(
        { success: false, message: "staffId, action, and pin or password are required" },
        { status: 400 },
      );
    }

    let objId = null;
    try { objId = new ObjectId(staffId); } catch { }

    const usersCol = MONGODB.collection("user");
    const ids: any[] = [staffId];
    if (objId) ids.push(objId);

    const targetUser = await usersCol.findOne({ _id: { $in: ids } });

    if (!targetUser) {
      console.error(`[staff-action] Staff not found: ${staffId}`);
      return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });
    }

    let verified = false;

    if (pin) {
      if (!targetUser.attendancePin) {
        return NextResponse.json(
          { success: false, message: "This staff has no PIN set. Please use password instead." },
          { status: 400 },
        );
      }
      verified = String(targetUser.attendancePin) === String(pin);
    } else if (password) {
      const accountsCol = MONGODB.collection("account");

      // DEBUG: Check what's in the account collection
      const allAccounts = await accountsCol.find({
        userId: { $in: [targetUser._id.toString(), targetUser._id] },
      }).toArray();
      console.log("[DEBUG] All accounts for user:", JSON.stringify(allAccounts.map(a => ({
        providerId: a.providerId,
        hasPassword: !!a.password,
        passwordPreview: a.password ? a.password.substring(0, 30) + "..." : null,
        userId: a.userId,
      })), null, 2));

      const account = allAccounts.find(a => a.providerId === "credential");
      console.log("[DEBUG] Found credential account:", !!account);
      console.log("[DEBUG] Full password hash:", account?.password);

      if (!account?.password) {
        console.error(`[staff-action] No password account found for staff: ${staffId}`);
        return NextResponse.json(
          { success: false, message: "No password found for this account. Please set a PIN in settings." },
          { status: 401 },
        );
      }

      console.log("[DEBUG] Attempting to verify password...");
      console.log("[DEBUG] Hash starts with:", account.password.substring(0, 10));
      verified = await verifyPassword(account.password, password);
      console.log("[DEBUG] Verification result:", verified);
    }

    if (!verified) {
      console.warn(`[staff-action] Verification failed for staff: ${staffId}`);
      return NextResponse.json(
        { success: false, message: "Invalid PIN or password" },
        { status: 401 },
      );
    }

    const userId = targetUser._id.toString();
    const userName = targetUser.name as string;

    if (action === "clock-in") {
      const attendance = await AttendanceModel.clockIn(userId);
      if (!attendance) {
        return NextResponse.json({
          success: false,
          message: "Already clocked in for this shift",
          alreadyClockedIn: true,
        });
      }
      console.log(`[staff-action] ${userName} clocked in`);
      await ShopStatusModel.setStatus(true, userName);
      notifyShopStatus(true, userName);
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
      console.log(`[staff-action] ${userName} clocked out`);
      return NextResponse.json({
        success: true,
        message: `${userName} clocked out. Hours worked: ${attendance.hoursWorked?.toFixed(2)}h`,
        attendance,
        hoursWorked: attendance.hoursWorked,
        isClockedIn: false,
      });
    }
  } catch (error) {
    console.error("[staff-action] Critical error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

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
    const ids: any[] = [staffId];
    if (objId) ids.push(objId);

    const targetUser = await usersCol.findOne(
      { _id: { $in: ids } },
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