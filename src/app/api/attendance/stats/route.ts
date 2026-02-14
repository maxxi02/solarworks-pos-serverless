// app/api/attendance/stats/route.ts

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
    const stats = await AttendanceModel.getUserMonthlyStats(userId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
