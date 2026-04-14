// app/api/attendance/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { AttendanceModel } from "@/models/attendance.model"; 

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const attendance = await AttendanceModel.getTodayAttendance(userId);

    // isClockedIn is only true if we have a record with no clockOutTime
    const isClockedIn = !!attendance && !attendance.clockOutTime;

    return NextResponse.json({
      success: true,
      attendance,
      isClockedIn,
    });
  } catch (error) {
    console.error("Get status error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
