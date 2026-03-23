import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { OvertimeRequestModel } from "@/models/overtime-request.model";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "true";

    const records = await OvertimeRequestModel.getAll();
    // By default only return pending (approval queue). Pass ?all=true for dashboard.
    const result = showAll ? records : records.filter(r => r.status === "pending");
    return NextResponse.json({ success: true, records: result });
  } catch (error) {
    console.error("Get all overtime requests error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
