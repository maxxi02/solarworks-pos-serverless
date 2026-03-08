import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";
import {
  AttendanceRecord,
  EnrichedAttendance,
  UserBasicInfo,
} from "@/types/attendance";

export async function GET(req: NextRequest) {
  try {
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
        { success: false, message: "Access denied" },
        { status: 403 },
      );
    }

    const tempCollection =
      MONGODB.collection<AttendanceRecord>("attendance_temp");

    // Use aggregation with $lookup for faster server-side join
    const enrichedRecords = await tempCollection
      .aggregate([
        { $sort: { clockInTime: -1 } },
        {
          $lookup: {
            from: "user",
            let: { userIdStr: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", { $toObjectId: "$$userIdStr" }],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  email: 1,
                  role: 1,
                },
              },
            ],
            as: "userInfo",
          },
        },
        {
          $addFields: {
            user: { $arrayElemAt: ["$userInfo", 0] },
          },
        },
        {
          $project: {
            userInfo: 0,
          },
        },
      ])
      .toArray();

    // Minor formatting to ensure IDs are strings for the frontend
    const formattedRecords = enrichedRecords.map((record) => ({
      ...record,
      _id: String(record._id),
      userId: String(record.userId),
      user: record.user
        ? {
            id: String(record.user._id),
            name: record.user.name || "Unnamed User",
            email: record.user.email || "—",
            role: record.user.role || "—",
          }
        : undefined,
    }));

    return NextResponse.json({
      success: true,
      records: formattedRecords,
    });
  } catch (error) {
    console.error("[pending] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
