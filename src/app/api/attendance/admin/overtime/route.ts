import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { OvertimeRequestModel } from "@/models/overtime-request.model";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    const records = await OvertimeRequestModel.getAll();
    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error("Get all overtime requests error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
