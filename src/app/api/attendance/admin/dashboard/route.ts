// app/api/attendance/admin/dashboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";
import type {
  Attendance,
  EnrichedAttendance,
  DashboardStats,
} from "@/types/attendance";
import { calculateDailyEarnings } from "@/models/attendance.model";

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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const staffId = searchParams.get("staffId");

    const query: Record<string, unknown> = { status: "confirmed" }; // only confirmed → pay

    if (staffId) query.userId = new ObjectId(staffId);
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };

    const attendanceColl = MONGODB.collection<Attendance>("attendance");
    const records = await attendanceColl
      .find(query)
      .sort({ date: -1, clockInTime: -1 })
      .toArray();

    // Fetch users with salaryPerHour
    const userIds = [...new Set(records.map((r) => r.userId.toString()))];
    const usersColl = MONGODB.collection("user");
    const users = await usersColl
      .find(
        { _id: { $in: userIds.map((id) => new ObjectId(id)) } },
        { projection: { name: 1, email: 1, role: 1, salaryPerHour: 1 } },
      )
      .toArray();

    const userMap = new Map(
      users.map((u) => [
        u._id.toString(),
        {
          id: u._id.toString(),
          name: u.name || "Unnamed",
          email: u.email || "—",
          role: u.role || "—",
          salaryPerHour: u.salaryPerHour ?? 56.25,
        },
      ]),
    );

    const enrichedRecords: EnrichedAttendance[] = [];
    let totalEarnings = 0;
    let regularEarnings = 0;
    let overtimeEarnings = 0;

    for (const r of records) {
      const user = userMap.get(r.userId.toString());
      if (!user) continue;

      const earnings = calculateDailyEarnings(r, user.salaryPerHour);

      const enriched: EnrichedAttendance = {
        ...r,
        _id: r._id.toString(),
        userId: r.userId.toString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          salaryPerHour: user.salaryPerHour,
        },
        dailyEarnings: earnings.total,
        regularEarnings: earnings.regular,
        overtimeEarnings: earnings.overtime,
        overtimeHours: earnings.otHours,
      };

      enrichedRecords.push(enriched);

      totalEarnings += earnings.total;
      regularEarnings += earnings.regular;
      overtimeEarnings += earnings.overtime;
    }

    const totalHours = records.reduce(
      (sum, r) => sum + (r.hoursWorked ?? 0),
      0,
    );
    const uniqueStaff = userMap.size;

    const stats: DashboardStats = {
      totalRecords: records.length,
      totalHours: Math.round(totalHours * 100) / 100,
      uniqueStaff,
      averageHours: records.length
        ? Math.round((totalHours / records.length) * 100) / 100
        : 0,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      regularEarnings: Math.round(regularEarnings * 100) / 100,
      overtimeEarnings: Math.round(overtimeEarnings * 100) / 100,
      averageDailyEarnings: records.length
        ? Math.round((totalEarnings / records.length) * 100) / 100
        : 0,
    };

    return NextResponse.json({
      success: true,
      records: enrichedRecords,
      stats,
    });
  } catch (err) {
    console.error("[admin dashboard]", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
