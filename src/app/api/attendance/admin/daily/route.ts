// app/api/attendance/admin/daily/route.ts
// Returns per-staff attendance status for a specific date

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { computeOvertimeHours } from "@/lib/overtime";

export interface DailyStaffStatus {
  staffId: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  // attendance fields
  status: "present" | "absent" | "late";
  clockInTime: string | null;
  clockOutTime: string | null;
  hoursWorked: number | null;
  attendanceStatus: "confirmed" | "pending" | null; // DB record status
  isCurrentlyIn: boolean; // clocked in but not out yet
  shift: string | null;
  overtimeHours: number;
}

export interface DailySummary {
  date: string;
  totalStaff: number;
  present: number;
  absent: number;
  late: number;
  currentlyIn: number;
}

// A clock-in after this time (local hours) is considered "late"
const LATE_THRESHOLD_HOUR = 9; // 9:00 AM

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || !["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    // Default to today
    const date =
      searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    // 1. Fetch ALL staff/manager users
    const usersColl = MONGODB.collection("user");
    const allStaff = await usersColl
      .find(
        { role: { $in: ["staff", "manager"] } },
        { projection: { _id: 1, id: 1, name: 1, email: 1, role: 1, image: 1 } },
      )
      .sort({ name: 1 })
      .toArray();

    // 2. Fetch attendance records for that date (both temp & confirmed)
    const [tempRecords, confirmedRecords] = await Promise.all([
      MONGODB.collection("attendance_temp")
        .find({ date })
        .toArray(),
      MONGODB.collection("attendance")
        .find({ date })
        .toArray(),
    ]);

    // Build maps: userId → record (prefer confirmed over temp)
    const recordMap = new Map<string, typeof confirmedRecords[0]>();
    for (const r of tempRecords) {
      recordMap.set(String(r.userId), r);
    }
    for (const r of confirmedRecords) {
      // confirmed overrides temp
      recordMap.set(String(r.userId), r);
    }

    // 3. Build daily staff status list
    const staffStatuses: DailyStaffStatus[] = allStaff.map((user) => {
      // Better auth uses `id` (string), but we fallback to _id just in case
      const userId = user.id ? String(user.id) : user._id.toString();
      const record = recordMap.get(userId);

      if (!record) {
        // No attendance record = absent
        return {
          staffId: userId,
          name: user.name || "Unknown",
          email: user.email || "",
          role: user.role || "",
          image: user.image ?? null,
          status: "absent",
          clockInTime: null,
          clockOutTime: null,
          hoursWorked: null,
          attendanceStatus: null,
          isCurrentlyIn: false,
          shift: null,
          overtimeHours: 0,
        } as DailyStaffStatus;
      }

      // Determine if late: clock-in time hour >= threshold
      const clockIn = new Date(record.clockInTime);
      const clockInHour = clockIn.getHours();
      const clockInMinute = clockIn.getMinutes();
      const isLate =
        clockInHour > LATE_THRESHOLD_HOUR ||
        (clockInHour === LATE_THRESHOLD_HOUR && clockInMinute > 0);

      const hoursWorked = record.hoursWorked ?? null;
      // OT = whole hours beyond the 10h threshold (9h quota + 1h buffer)
      const overtimeHours =
        hoursWorked != null ? computeOvertimeHours(hoursWorked) : 0;

      return {
        staffId: userId,
        name: user.name || "Unknown",
        email: user.email || "",
        role: user.role || "",
        image: user.image ?? null,
        status: isLate ? "late" : "present",
        clockInTime: record.clockInTime
          ? new Date(record.clockInTime).toISOString()
          : null,
        clockOutTime: record.clockOutTime
          ? new Date(record.clockOutTime).toISOString()
          : null,
        hoursWorked,
        attendanceStatus: record.status ?? null,
        isCurrentlyIn: !record.clockOutTime,
        shift: record.shift ?? null,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
      } as DailyStaffStatus;
    });

    const present = staffStatuses.filter((s) => s.status === "present").length;
    const late = staffStatuses.filter((s) => s.status === "late").length;
    const absent = staffStatuses.filter((s) => s.status === "absent").length;
    const currentlyIn = staffStatuses.filter((s) => s.isCurrentlyIn).length;

    const summary: DailySummary = {
      date,
      totalStaff: allStaff.length,
      present,
      absent,
      late,
      currentlyIn,
    };

    return NextResponse.json({
      success: true,
      date,
      summary,
      staff: staffStatuses,
    });
  } catch (err) {
    console.error("[admin/daily]", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
