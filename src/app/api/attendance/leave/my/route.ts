import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { LeaveRequestModel } from "@/models/leave-request.model";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const records = await LeaveRequestModel.getByUser(session.user.id);
    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error("Get my leave requests error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
