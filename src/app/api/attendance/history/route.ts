// app/api/attendance/history/route.ts

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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = parseInt(searchParams.get("limit") || "30");

    const userId = session.user.id;
    const history = await AttendanceModel.getUserAttendanceHistory(
      userId,
      startDate,
      endDate,
      limit,
    );

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
