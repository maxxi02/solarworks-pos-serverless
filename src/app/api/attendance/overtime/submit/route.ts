import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { OvertimeRequestModel } from "@/models/overtime-request.model";
import { MONGODB } from "@/config/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { success: allowed, response: limitResponse } = rateLimit(req, LIMITS.overtimeSubmit, session.user.id);
    if (!allowed) return limitResponse!;

    const body = await req.json();
    const { date, requestedHours, reason } = body;

    if (!date || !requestedHours || !reason?.trim()) {
      return NextResponse.json({ success: false, message: "Date, hours, and reason are required" }, { status: 400 });
    }

    const hours = Number(requestedHours);
    if (isNaN(hours) || hours <= 0 || hours > 12) {
      return NextResponse.json({ success: false, message: "Requested hours must be between 0.5 and 12" }, { status: 400 });
    }

    // CHECK: Ensure user has clocked in at least once on this date
    // We check both the pending/temp collection and the confirmed collection.
    
    const tempRecord = await MONGODB.collection("attendance_temp").findOne({
      userId: session.user.id,
      date: date
    });

    const confirmedRecord = await MONGODB.collection("attendance").findOne({
      userId: session.user.id,
      date: date
    });

    if (!tempRecord && !confirmedRecord) {
      return NextResponse.json(
        { success: false, message: `You cannot request overtime because you haven't clocked in on ${date} yet.` },
        { status: 400 }
      );
    }

    const record = await OvertimeRequestModel.submit(
      session.user.id,
      session.user.name ?? "Unknown",
      date,
      hours,
      reason.trim()
    );

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Submit overtime request error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
