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
    if (session.user.role !== "admin" && session.user.role !== "manager") {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") ?? new Date().toISOString().split("T")[0];
    const endDate = searchParams.get("endDate") ?? startDate;
    const staffId = searchParams.get("staffId") ?? undefined;

    const schedules = await ShiftScheduleModel.getByDateRange(startDate, endDate, staffId);
    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error("Get schedules error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin" && session.user.role !== "manager") {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { staffId, staffName, date, dateTo, startTime, endTime, notes } = body;

    if (!staffId || !staffName || !date || !startTime || !endTime) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const endDate = dateTo || date; // Support single day or range

    const count = await ShiftScheduleModel.createMany({
      staffId,
      staffName,
      dateFrom: date,
      dateTo: endDate,
      startTime,
      endTime,
      notes,
      createdBy: session.user.id,
    });

    return NextResponse.json({ success: true, message: `Created ${count} shifts` }, { status: 201 });
  } catch (error) {
    console.error("Create schedule error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
