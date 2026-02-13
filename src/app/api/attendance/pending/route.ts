// app/api/attendance/pending/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MONGODB } from "@/config/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    // Restrict to managers/admins only
    const role = session.user.role;
    if (!["manager", "admin"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    // Allow filtering by status (comma-separated), default to pending ones
    let statusFilter: string[] = ["PENDING_CHECKIN", "PENDING_CHECKOUT"];
    if (statusParam) {
      statusFilter = statusParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const attendanceColl = MONGODB.collection("attendance");

    // Basic aggregation to join with user info
    const pipeline = [
      {
        $match: {
          status: { $in: statusFilter },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userArray",
        },
      },
      {
        $addFields: {
          user: { $arrayElemAt: ["$userArray", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          userId: 1,
          requestedCheckInAt: 1,
          requestedCheckOutAt: 1,
          checkInLocation: 1,
          checkOutLocation: 1,
          workSummary: 1,
          "user.name": 1,
          "user.email": 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      { $sort: { createdAt: -1 } }, // newest first
      { $limit: 100 }, // safety limit
    ];

    const attendances = await attendanceColl.aggregate(pipeline).toArray();

    console.log(
      `[attendance:pending] Found ${attendances.length} pending requests`,
    );

    return NextResponse.json({
      success: true,
      attendances,
      count: attendances.length,
    });
  } catch (err: unknown) {
    console.error("[attendance:pending] GET error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
