import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ShiftScheduleModel } from "@/models/shift-schedule.model";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") ?? new Date().toISOString().split("T")[0];
    const endDate = searchParams.get("endDate") ?? startDate;
    
    // Only fetch schedule for the currently logged-in user
    const staffId = session.user.id;

    const schedules = await ShiftScheduleModel.getByDateRange(startDate, endDate, staffId);
    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error("Get schedules error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
