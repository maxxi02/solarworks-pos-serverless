// app/api/attendance/clock-in/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { userId, requestedCheckInAt, checkInLocation } = body;

    if (userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "You can only clock in for yourself" },
        { status: 403 },
      );
    }

    if (
      !requestedCheckInAt ||
      !checkInLocation?.latitude ||
      !checkInLocation?.longitude
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    const attendanceColl = MONGODB.collection("attendance");

    // Optional: check if user already has active/pending record today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existing = await attendanceColl.findOne({
      userId: new ObjectId(userId),
      createdAt: { $gte: todayStart },
      status: { $in: ["PENDING_CHECKIN", "CLOCKED_IN", "PENDING_CHECKOUT"] },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "You already have an active/pending attendance record today",
        },
        { status: 409 },
      );
    }

    const result = await attendanceColl.insertOne({
      userId: new ObjectId(userId),
      status: "PENDING_CHECKIN",
      requestedCheckInAt: new Date(requestedCheckInAt),
      checkInLocation,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const attendanceId = result.insertedId.toString();

    // Socket emit removed - debugging

    return NextResponse.json({
      success: true,
      attendanceId,
      attendance: {
        id: attendanceId,
        status: "PENDING_CHECKIN",
        requestedCheckInAt: new Date(requestedCheckInAt).toISOString(),
      },
    });
  } catch (err: unknown) {
    console.error("[clock-in]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
