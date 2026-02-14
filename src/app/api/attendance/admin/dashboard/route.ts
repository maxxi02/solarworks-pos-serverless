// app/api/attendance/admin/dashboard/route.ts

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
        { status: 401 }
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
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const staffId = searchParams.get("staffId") || undefined;

    // Get attendance records based on filters
    const query: Record<string, unknown> = {};

    if (staffId) {
      query.userId = staffId;
    }

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Get confirmed attendance records
    const collection = MONGODB.collection("attendance");
    const records = await collection
      .find(query)
      .sort({ date: -1, clockInTime: -1 })
      .toArray();

    // Get user details for all records
    const usersCollection = MONGODB.collection("user");
    const userIds = [...new Set(records.map((r) => r.userId))];

    // 🔥 FIX: Better Auth stores user ID in _id field (as string)
    // So we need to query by _id, not id
    const users = await usersCollection
      .find({ _id: { $in: userIds } })
      .toArray();

    // 🔥 FIX: Map users by _id (converted to string)
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
              salaryPerHour: user.salaryPerHour,
            }
          : undefined,
      };
    });

    // Calculate overall statistics
    const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    const uniqueStaff = new Set(records.map((r) => r.userId)).size;
    const averageHours = records.length > 0 ? totalHours / records.length : 0;

    return NextResponse.json({
      success: true,
      records: recordsWithUsers,
      stats: {
        totalRecords: records.length,
        totalHours: Math.round(totalHours * 100) / 100,
        uniqueStaff,
        averageHours: Math.round(averageHours * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: String(error) },
      { status: 500 }
    );
  }
}