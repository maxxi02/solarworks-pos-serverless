import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import MONGODB from "@/config/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const currentShift = new Date().getHours() < 12 ? "morning" : "afternoon";

    // ── 4 parallel queries for efficiency ──────────
    const [staffList, tempRecords, confirmedRecords, shiftRecords] = await Promise.all([
      MONGODB.collection("user")
        .find(
          { role: { $in: ["staff", "manager"] } },
          { projection: { _id: 1, name: 1, email: 1, role: 1, image: 1, attendancePin: 1 } },
        )
        .sort({ name: 1 })
        .toArray(),
      MONGODB.collection("attendance_temp")
        .find({ date: today, shift: currentShift }, { projection: { userId: 1, clockInTime: 1, clockOutTime: 1 } })
        .toArray(),
      MONGODB.collection("attendance")
        .find({ date: today, shift: currentShift }, { projection: { userId: 1, clockInTime: 1, clockOutTime: 1 } })
        .toArray(),
      MONGODB.collection("shift_schedules")
        .find({ date: today })
        .toArray(),
    ]);

    // ── Join in memory ──────────
    const tempMap = new Map(tempRecords.map((r) => [r.userId.toString(), r]));
    const confirmedMap = new Map(confirmedRecords.map((r) => [r.userId.toString(), r]));
    const shiftMap = new Map(shiftRecords.map((r) => [r.staffId, r]));

    const staff = staffList.map((user) => {
      const userId = user._id.toString();
      const attendance = tempMap.get(userId) ?? confirmedMap.get(userId) ?? null;
      const shift = shiftMap.get(userId);

      return {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image ?? null,
        hasPin: !!user.attendancePin,
        isClockedIn: !!attendance && !attendance.clockOutTime,
        clockInTime: attendance?.clockInTime ?? null,
        assignedShift: shift ? `${shift.startTime} - ${shift.endTime}` : null,
        shiftNotes: shift?.notes || null,
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