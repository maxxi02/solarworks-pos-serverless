// app/api/attendance/admin/pending/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { AttendanceModel } from "@/models/attendance.model"; 
import { MONGODB } from "@/config/db";

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

    // Check if user is admin or manager
    const userRole = session.user.role;
    if (userRole !== "admin" && userRole !== "manager") {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Admin or Manager role required.",
        },
        { status: 403 },
      );
    }

    const pendingRecords = await AttendanceModel.getPendingAttendance();

    // Fetch user details for each attendance record
    const usersCollection = MONGODB.collection("user");
    const userIds = [...new Set(pendingRecords.map((r) => r.userId))];

    const users = await usersCollection
      .find({ id: { $in: userIds } })
      .toArray();

    const userMap = new Map(users.map((u) => [u.id, u]));

    const recordsWithUsers = pendingRecords.map((record) => {
      const user = userMap.get(record.userId);
      return {
        ...record,
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            }
          : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      records: recordsWithUsers,
    });
  } catch (error) {
    console.error("Get pending attendance error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
