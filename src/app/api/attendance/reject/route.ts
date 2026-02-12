// app/api/attendance/reject/route.ts
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

    if (!["manager", "admin"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { attendanceId, reason } = body;

    if (!attendanceId || !reason?.trim()) {
      return NextResponse.json(
        { success: false, message: "attendanceId and reason are required" },
        { status: 400 },
      );
    }

    const attendanceColl = MONGODB.collection("attendance");

    // First, get the attendance record to retrieve userId
    const attendance = await attendanceColl.findOne({
      _id: new ObjectId(attendanceId),
      status: { $in: ["PENDING_CHECKIN", "PENDING_CHECKOUT"] },
    });

    if (!attendance) {
      return NextResponse.json(
        { success: false, message: "Record not found or not in pending state" },
        { status: 400 },
      );
    }

    // Update the record
    const result = await attendanceColl.updateOne(
      { _id: new ObjectId(attendanceId) },
      {
        $set: {
          status: "REJECTED",
          rejectionReason: reason.trim(),
          rejectedBy: new ObjectId(session.user.id),
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Update failed" },
        { status: 500 },
      );
    }

    // Socket emit removed - debugging

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[attendance:reject]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
