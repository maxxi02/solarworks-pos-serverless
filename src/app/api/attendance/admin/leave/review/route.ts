import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { LeaveRequestModel } from "@/models/leave-request.model";
import { ShiftScheduleModel } from "@/models/shift-schedule.model";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin" && session.user.role !== "manager") {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { leaveId, status, reviewNote } = body;

    if (!leaveId || !status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 });
    }

    const leaveRequest = await LeaveRequestModel.getById(leaveId);
    if (!leaveRequest) {
      return NextResponse.json({ success: false, message: "Leave request not found" }, { status: 404 });
    }

    const updated = await LeaveRequestModel.review(
      leaveId,
      status,
      session.user.id,
      reviewNote
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "Failed to update leave request" }, { status: 500 });
    }

    // Auto-remove any assigned shift schedule overlapping with this approved leave
    if (status === "approved") {
      await ShiftScheduleModel.deleteByDateRange(
        leaveRequest.startDate,
        leaveRequest.endDate,
        leaveRequest.userId
      );
    }

    return NextResponse.json({ success: true, message: `Leave request ${status}` });
  } catch (error) {
    console.error("Review leave request error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
