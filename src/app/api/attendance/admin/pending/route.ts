// app/api/attendance/admin/pending/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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

    // Get pending attendance records
    const attendanceCollection = MONGODB.collection("attendance");
    const records = await attendanceCollection
      .find({ status: "pending" })
      .sort({ clockInTime: -1 })
      .toArray();

    // Fetch user details for each attendance record
    const usersCollection = MONGODB.collection("user");
    const userIds = [...new Set(records.map((r) => r.userId))];

    // 🔥 FIX: Query by _id field
    const users = await usersCollection
      .find({ _id: { $in: userIds } })
      .toArray();

    // 🔥 FIX: Map by _id as string
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const recordsWithUsers = records.map((record) => {
      const user = userMap.get(record.userId);
      return {
        ...record,
        _id: record._id.toString(),
        user: user
          ? {
              id: user._id.toString(),
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