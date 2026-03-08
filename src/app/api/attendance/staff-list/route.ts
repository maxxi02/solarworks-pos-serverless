// app/api/attendance/staff-list/route.ts
// Returns all staff members with their today's clock-in status and whether
// they have a PIN set. Accessible to any authenticated session.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { AttendanceModel } from "@/models/attendance.model";

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
    const hours = new Date().getHours();
    const currentShift = hours < 12 ? "morning" : "afternoon";

    const usersCol = MONGODB.collection("user");

    // Use aggregation to join with attendance and attendance_temp in one trip
    const staffWithStatus = await usersCol
      .aggregate([
        // 1. Filter for staff members
        {
          $match: {
            role: { $in: ["staff", "manager"] },
          },
        },
        // 2. Sort by name
        { $sort: { name: 1 } },
        // 3. Project only needed user fields
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            role: 1,
            image: 1,
            attendancePin: 1,
          },
        },
        // 4. Lookup from confirmed attendance (today + current shift)
        {
          $lookup: {
            from: "attendance",
            let: { userId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$date", today] },
                      { $eq: ["$shift", currentShift] },
                    ],
                  },
                },
              },
            ],
            as: "confirmedAttendance",
          },
        },
        // 5. Lookup from temp attendance (today + current shift)
        {
          $lookup: {
            from: "attendance_temp",
            let: { userId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$userId"] },
                      { $eq: ["$date", today] },
                      { $eq: ["$shift", currentShift] },
                    ],
                  },
                },
              },
            ],
            as: "tempAttendance",
          },
        },
        // 6. Project final staff object
        {
          $project: {
            id: { $toString: "$_id" },
            name: 1,
            email: 1,
            role: 1,
            image: { $ifNull: ["$image", null] },
            hasPin: { $gt: [{ $ifNull: ["$attendancePin", ""] }, ""] },
            // Combine confirmed and temp attendance to get current status
            attendance: {
              $ifNull: [
                { $arrayElemAt: ["$tempAttendance", 0] },
                { $arrayElemAt: ["$confirmedAttendance", 0] },
              ],
            },
          },
        },
        // 7. Map to final output format
        {
          $project: {
            id: 1,
            name: 1,
            email: 1,
            role: 1,
            image: 1,
            hasPin: 1,
            isClockedIn: {
              $and: [
                { $gt: ["$attendance", null] },
                { $not: ["$attendance.clockOutTime"] },
              ],
            },
            clockInTime: { $ifNull: ["$attendance.clockInTime", null] },
          },
        },
      ])
      .toArray();

    return NextResponse.json({ success: true, staff: staffWithStatus });
  } catch (error) {
    console.error("attendance/staff-list error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
