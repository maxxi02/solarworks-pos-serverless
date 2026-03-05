// app/api/attendance/staff-list/route.ts
// Returns all staff members with their today's clock-in status and whether
// they have a PIN set. Accessible to any authenticated session.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { AttendanceModel } from "@/models/attendance.model";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const usersCol = MONGODB.collection("user");
    const staffDocs = await usersCol
      .find(
        { role: { $in: ["staff", "manager"] } },
        { projection: { _id: 1, name: 1, email: 1, role: 1, image: 1, attendancePin: 1 } },
      )
      .sort({ name: 1 })
      .toArray();

    // Fetch today's attendance for each staff member
    const staffWithStatus = await Promise.all(
      staffDocs.map(async (s) => {
        const userId = s._id.toString();
        const attendance = await AttendanceModel.getTodayAttendance(userId);
        return {
          id: userId,
          name: s.name as string,
          email: s.email as string,
          role: s.role as string,
          image: (s.image as string) || null,
          hasPin: !!(s.attendancePin),
          isClockedIn: !!attendance && !attendance.clockOutTime,
          clockInTime: attendance?.clockInTime ?? null,
        };
      }),
    );

    return NextResponse.json({ success: true, staff: staffWithStatus });
  } catch (error) {
    console.error("attendance/staff-list error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
