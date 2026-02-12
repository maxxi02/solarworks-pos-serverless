// app/api/attendance/today/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const attendanceColl = MONGODB.collection("attendance");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const attendance = await attendanceColl.findOne({
      userId: new ObjectId(session.user.id),
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    if (!attendance) {
      return NextResponse.json({
        success: true,
        attendance: null,
      });
    }

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance._id.toString(),
        status: attendance.status,
        requestedCheckInAt: attendance.requestedCheckInAt,
        approvedCheckInAt: attendance.approvedCheckInAt,
        requestedCheckOutAt: attendance.requestedCheckOutAt,
        approvedCheckOutAt: attendance.approvedCheckOutAt,
        workSummary: attendance.workSummary,
        rejectionReason: attendance.rejectionReason,
        totalHours: attendance.totalHours,
        checkInLocation: attendance.checkInLocation,
        checkOutLocation: attendance.checkOutLocation,
      },
    });
  } catch (err) {
    console.error("[attendance:today]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
