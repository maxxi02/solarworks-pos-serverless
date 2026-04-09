// app/api/user/attendance-pin/route.ts
// Staff can set or clear their own attendance PIN (4-6 digits).
// Stored as a simple string (no separate hashing needed – short PIN is stored
// hashed in the user document via a lightweight sha-256 or we just store it
// plainly since it is optional convenience auth, not a security credential).
// For simplicity we store it as a plain 4-6 digit string in the `user` collection.
// If you want to hash it later you can add bcrypt here.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { pin } = await req.json() as { pin?: string };

    // Allow clearing PIN by sending empty/null
    if (pin !== undefined && pin !== null && pin !== "") {
      if (!/^\d{4}$/.test(pin)) {
        return NextResponse.json(
          { success: false, message: "PIN must be exactly 4 digits" },
          { status: 400 },
        );
      }
    }

    const usersCol = MONGODB.collection("user");
    await usersCol.updateOne(
      { _id: new ObjectId(session.user.id) },
      pin
        ? { $set: { attendancePin: pin, updatedAt: new Date() } }
        : { $unset: { attendancePin: "" }, $set: { updatedAt: new Date() } },
    );

    return NextResponse.json({
      success: true,
      message: pin ? "Attendance PIN set successfully" : "Attendance PIN removed",
      hasPin: !!pin,
    });
  } catch (error) {
    console.error("Set PIN error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const usersCol = MONGODB.collection("user");
    const user = await usersCol.findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { attendancePin: 1 } },
    );

    return NextResponse.json({
      success: true,
      hasPin: !!(user?.attendancePin),
    });
  } catch (error) {
    console.error("Get PIN error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
