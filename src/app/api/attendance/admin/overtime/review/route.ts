import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { OvertimeRequestModel } from "@/models/overtime-request.model";

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

    const success = await OvertimeRequestModel.review(
      overtimeId,
      status,
      session.user.id,
      reviewNote
    );

    if (!success) {
      return NextResponse.json({ success: false, message: "Overtime request not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review overtime request error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
