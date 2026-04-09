// app/api/attendance/clock-in/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { AttendanceModel } from "@/models/attendance.model"; 
import type { ClockInResponse } from "@/types/attendance"; 

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
    const attendance = await AttendanceModel.clockIn(userId);

    if (!attendance) {
      const response: ClockInResponse = {
        success: false,
        message: "You have already clocked in today",
        alreadyClockedIn: true,
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ClockInResponse = {
      success: true,
      attendance,
      message: "Successfully clocked in",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Clock-in error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
