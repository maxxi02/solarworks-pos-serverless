// app/api/attendance/clock-out/route.ts
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
    const { attendanceId, workSummary, requestedCheckOutAt, checkOutLocation } =
      body;

    if (
      !attendanceId ||
      !requestedCheckOutAt ||
      !checkOutLocation?.latitude ||
      !checkOutLocation?.longitude
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    const attendanceColl = MONGODB.collection("attendance");

    const attendance = await attendanceColl.findOne({
      _id: new ObjectId(attendanceId),
      userId: new ObjectId(session.user.id),
    });

    if (!attendance) {
      return NextResponse.json(
        { success: false, message: "Attendance record not found" },
        { status: 404 },
      );
    }

    if (attendance.status !== "CLOCKED_IN") {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot clock out from status: ${attendance.status}`,
        },
        { status: 400 },
      );
    }

    const updateResult = await attendanceColl.updateOne(
      { _id: new ObjectId(attendanceId) },
      {
        $set: {
          status: "PENDING_CHECKOUT",
          workSummary: workSummary?.trim() || null,
          requestedCheckOutAt: new Date(requestedCheckOutAt),
          checkOutLocation,
          updatedAt: new Date(),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Update failed" },
        { status: 500 },
      );
    }

    // Socket emit removed - debugging

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[clock-out]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
