// app/api/attendance/approve/route.ts
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

    const role = session.user.role;
    if (!["manager", "admin"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      attendanceId,
      approveCheckIn = false,
      approveCheckOut = false,
    } = body;

    if (!attendanceId || (!approveCheckIn && !approveCheckOut)) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    const attendanceColl = MONGODB.collection("attendance");

    const attendance = await attendanceColl.findOne({
      _id: new ObjectId(attendanceId),
    });

    if (!attendance) {
      return NextResponse.json(
        { success: false, message: "Attendance not found" },
        { status: 404 },
      );
    }

    const $set: Record<string, unknown> = {
      updatedAt: new Date(),
      approvedBy: new ObjectId(session.user.id),
    };

    let newStatus = attendance.status;

    if (approveCheckIn && attendance.status === "PENDING_CHECKIN") {
      $set.approvedCheckInAt = new Date();
      newStatus = "CLOCKED_IN";
    }

    if (approveCheckOut && attendance.status === "PENDING_CHECKOUT") {
      $set.approvedCheckOutAt = new Date();

      const start =
        attendance.approvedCheckInAt || attendance.requestedCheckInAt;
      if (start) {
        const diffMs = new Date().getTime() - new Date(start).getTime();
        $set.totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      }

      newStatus = "CLOCKED_OUT";
    }

    $set.status = newStatus;

    const result = await attendanceColl.updateOne(
      { _id: new ObjectId(attendanceId) },
      { $set },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Update failed" },
        { status: 500 },
      );
    }

    // Socket emit removed - debugging

    return NextResponse.json({
      success: true,
      status: newStatus,
      totalHours: $set.totalHours,
    });
  } catch (err: unknown) {
    console.error("[attendance:approve]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
