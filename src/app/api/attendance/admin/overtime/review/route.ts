import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { OvertimeRequestModel } from "@/models/overtime-request.model";
import { MONGODB } from "@/config/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { overtimeId, status, reviewNote } = body;

    if (!overtimeId || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, message: "overtimeId and valid status are required" }, { status: 400 });
    }

    // Get the overtime request details before reviewing
    const overtimeRequest = await OvertimeRequestModel.getById(overtimeId);
    if (!overtimeRequest) {
      return NextResponse.json({ success: false, message: "Overtime request not found" }, { status: 404 });
    }

    const success = await OvertimeRequestModel.review(
      overtimeId,
      status,
      session.user.id,
      reviewNote
    );

    if (!success) {
      return NextResponse.json({ success: false, message: "Failed to update overtime request" }, { status: 404 });
    }

    // If approved, save the overtime hours to the attendance record for that date
    if (status === "approved") {
      const attendanceCollection = MONGODB.collection("attendance");
      const tempCollection = MONGODB.collection("attendance_temp");

      // Try to update attendance record in the confirmed collection first
      const confirmedUpdate = await attendanceCollection.updateOne(
        { userId: overtimeRequest.userId, date: overtimeRequest.date },
        {
          $inc: { overtimeApprovedHours: overtimeRequest.requestedHours },
          $set: { updatedAt: new Date() },
        }
      );

      // If not found in confirmed, try temp collection
      if (confirmedUpdate.matchedCount === 0) {
        await tempCollection.updateOne(
          { userId: overtimeRequest.userId, date: overtimeRequest.date },
          {
            $inc: { overtimeApprovedHours: overtimeRequest.requestedHours },
            $set: { updatedAt: new Date() },
          }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review overtime request error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
