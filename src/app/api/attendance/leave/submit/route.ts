import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { LeaveRequestModel } from "@/models/leave-request.model";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { startDate, endDate, reason } = body;

    if (!startDate || !endDate || !reason?.trim()) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const leave = await LeaveRequestModel.submit(
      session.user.id,
      session.user.name ?? "Staff",
      startDate,
      endDate,
      reason.trim()
    );

    return NextResponse.json({ success: true, leave });
  } catch (error) {
    console.error("Submit leave request error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
