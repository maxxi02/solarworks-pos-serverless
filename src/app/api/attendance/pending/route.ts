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

    // Optional: restrict to managers/admins only
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
          // Optional: only today's records (uncomment if desired)
          // createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
        },
      },
      {
        $lookup: {
          from: "users", // ← change if your users collection has different name
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          status: 1,
          userId: 1,
          requestedCheckInAt: 1,
          requestedCheckOutAt: 1,
          checkInLocation: 1,
          checkOutLocation: 1,
          "user.name": 1,
          "user.email": 1,
          // "user.department": 1,       // ← add if you have this field
          createdAt: 1,
          updatedAt: 1,
        },
      },
      { $sort: { createdAt: -1 } }, // newest first
      { $limit: 100 }, // safety limit — add pagination later if needed
    ];

    const attendances = await attendanceColl.aggregate(pipeline).toArray();

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
