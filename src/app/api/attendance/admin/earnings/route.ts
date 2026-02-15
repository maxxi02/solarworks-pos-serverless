// app/api/attendance/admin/earnings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";
import type { Attendance } from "@/types/attendance";
import { calculateDailyEarnings } from "@/models/attendance.model";

// Interface for the earnings calculation
interface StaffEarnings {
  staffId: string;
  name: string;
  email: string;
  totalEarnings: number;
  regularEarnings: number;
  overtimeEarnings: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  daysPresent: number;
  recordCount: number;
}

// Extended interface for internal tracking
interface StaffEarningsWithSet extends StaffEarnings {
  dateSet: Set<string>;
}

export async function GET(req: NextRequest) {
  try {
    // ── Authentication & authorization ────────────────────────────────
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { role } = session.user;
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Admin or Manager required.",
        },
        { status: 403 },
      );
    }

    // ── Query parameters ──────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const staffId = searchParams.get("staffId");

    // Build base query – only confirmed records contribute to earnings
    const query: Record<string, unknown> = { status: "confirmed" };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (staffId && staffId !== "all") {
      try {
        query.userId = new ObjectId(staffId);
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid staff ID format" },
          { status: 400 },
        );
      }
    }

    // ── Fetch attendance records ─────────────────────────────────────
    const attendanceColl = MONGODB.collection<Attendance>("attendance");
    const records = await attendanceColl
      .find(query)
      .sort({ date: 1, clockInTime: 1 })
      .toArray();

    if (records.length === 0) {
      return NextResponse.json({
        success: true,
        staffEarnings: [],
      });
    }

    // ── Group and calculate per staff ────────────────────────────────
    const earningsByStaff = new Map<string, StaffEarningsWithSet>();

    // First, get all unique user IDs
    const userIds = [...new Set(records.map((r) => r.userId.toString()))];

    // Fetch all users in one query (performance optimization)
    const userColl = MONGODB.collection("user");
    const users = await userColl
      .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
      .project({ name: 1, email: 1, salaryPerHour: 1 })
      .toArray();

    // Create a map for quick user lookup
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    // Process each record
    for (const record of records) {
      const userIdStr = record.userId.toString();
      const user = userMap.get(userIdStr);

      if (!earningsByStaff.has(userIdStr)) {
        // Initialize entry for new staff member
        earningsByStaff.set(userIdStr, {
          staffId: userIdStr,
          name: user?.name || "Unknown Staff",
          email: user?.email || "—",
          totalEarnings: 0,
          regularEarnings: 0,
          overtimeEarnings: 0,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          daysPresent: 0,
          recordCount: 0,
          dateSet: new Set<string>(),
        });
      }

      const entry = earningsByStaff.get(userIdStr)!;

      // Get hourly rate (default to 56.25 if not set)
      const hourlyRate = user?.salaryPerHour ?? 56.25;

      // Calculate earnings for this record
      const calc = calculateDailyEarnings(record, hourlyRate);

      // Update totals
      entry.totalEarnings += calc.total;
      entry.regularEarnings += calc.regular;
      entry.overtimeEarnings += calc.overtime;
      entry.totalHours += record.hoursWorked ?? 0;
      // Fix: Use the correct property names from calculateDailyEarnings
      entry.regularHours += (record.hoursWorked ?? 0) - calc.otHours; // Calculate regular hours
      entry.overtimeHours += calc.otHours; // Use otHours instead of overtimeHours
      entry.recordCount += 1;

      // Track unique days (handles multiple shifts per day correctly)
      entry.dateSet.add(record.date);
    }

    // Finalize result - convert to final format without the Set
    const staffEarnings: StaffEarnings[] = Array.from(earningsByStaff.values())
      .map((entry) => ({
        staffId: entry.staffId,
        name: entry.name,
        email: entry.email,
        totalEarnings: Math.round(entry.totalEarnings * 100) / 100,
        regularEarnings: Math.round(entry.regularEarnings * 100) / 100,
        overtimeEarnings: Math.round(entry.overtimeEarnings * 100) / 100,
        totalHours: Math.round(entry.totalHours * 100) / 100,
        regularHours: Math.round(entry.regularHours * 100) / 100,
        overtimeHours: Math.round(entry.overtimeHours * 100) / 100,
        daysPresent: entry.dateSet.size,
        recordCount: entry.recordCount,
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings); // highest earners first

    return NextResponse.json({
      success: true,
      staffEarnings,
      meta: {
        recordCount: records.length,
        period: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error("[earnings route]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
