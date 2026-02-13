// app/api/attendance/clock-out/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { AttendanceModel } from "@/models/attendance.model"; 
import type { ClockOutResponse } from "@/types/attendance"; 

export async function POST(req: NextRequest) {
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
    const attendance = await AttendanceModel.clockOut(userId);

    if (!attendance) {
      return NextResponse.json(
        {
          success: false,
          message: "Not clocked in or already clocked out",
        },
        { status: 400 },
      );
    }

    const response: ClockOutResponse = {
      success: true,
      attendance,
      hoursWorked: attendance.hoursWorked,
      message: `Successfully clocked out. Hours worked: ${attendance.hoursWorked?.toFixed(2)}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Clock-out error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
