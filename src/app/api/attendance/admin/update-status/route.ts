// app/api/attendance/admin/update-status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { AttendanceModel } from "@/models/attendance.model"; 
import type { AttendanceStatus } from "@/types/attendance";

interface UpdateStatusBody {
  attendanceId: string;
  status: AttendanceStatus;
  adminNote?: string;
}

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

    const userRole = session.user.role;
    if (userRole !== "admin" && userRole !== "manager") {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 },
      );
    }

    const body: UpdateStatusBody = await req.json();
    const { attendanceId, status, adminNote } = body;

    if (!attendanceId || !status) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    let updatedAttendance;

    if (status === "confirmed") {
      // Move from temp to permanent collection
      updatedAttendance = await AttendanceModel.confirmAttendance(
        attendanceId,
        session.user.id,
        adminNote,
      );
    } else if (status === "rejected") {
      // Delete from temp collection
      const deleted = await AttendanceModel.rejectAttendance(
        attendanceId,
        session.user.id,
        adminNote,
      );

      if (!deleted) {
        return NextResponse.json(
          { success: false, message: "Attendance record not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Attendance rejected and removed",
      });
    }

    if (!updatedAttendance) {
      return NextResponse.json(
        { success: false, message: "Attendance record not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      attendance: updatedAttendance,
      message: `Attendance ${status} successfully`,
    });
  } catch (error) {
    console.error("Update attendance status error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
