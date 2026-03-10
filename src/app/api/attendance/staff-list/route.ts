import { NextRequest, NextResponse } from "next/server";
import { getFastSession } from "@/lib/fast-session";
import MONGODB from "@/config/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import fs from "fs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const session = await getFastSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const currentShift = new Date().getHours() < 12 ? "morning" : "afternoon";

    // ── 3 simple parallel queries instead of 1 heavy aggregation ──────────
    const [staffList, tempRecords, confirmedRecords] = await Promise.all([
      // Query 1: get all staff/managers (hits role_name_sort index)
      MONGODB.collection("user")
        .find(
          { role: { $in: ["staff", "manager"] } },
          {
            projection: {
              _id: 1,
              name: 1,
              email: 1,
              role: 1,
              image: 1,
              attendancePin: 1,
            },
          },
        )
        .sort({ name: 1 })
        .toArray(),

      // Query 2: today's temp attendance for current shift
      MONGODB.collection("attendance_temp")
        .find(
          { date: today, shift: currentShift },
          { projection: { userId: 1, clockInTime: 1, clockOutTime: 1 } },
        )
        .toArray(),

      // Query 3: today's confirmed attendance for current shift
      MONGODB.collection("attendance")
        .find(
          { date: today, shift: currentShift },
          { projection: { userId: 1, clockInTime: 1, clockOutTime: 1 } },
        )
        .toArray(),
    ]);

    // ── Join in memory — O(1) map lookup, no extra DB round-trips ──────────
    const tempMap = new Map(tempRecords.map((r) => [r.userId, r]));
    const confirmedMap = new Map(confirmedRecords.map((r) => [r.userId, r]));

    const staff = staffList.map((user) => {
      const userId = user._id.toString();
      const attendance = tempMap.get(userId) ?? confirmedMap.get(userId) ?? null;

      return {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image ?? null,
        hasPin: !!user.attendancePin,
        isClockedIn: !!attendance && !attendance.clockOutTime,
        clockInTime: attendance?.clockInTime ?? null,
      };
    });

    return NextResponse.json({ success: true, staff }, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("attendance/staff-list error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}