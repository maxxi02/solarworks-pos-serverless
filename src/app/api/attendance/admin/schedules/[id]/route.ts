import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ShiftScheduleModel } from "@/models/shift-schedule.model";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin" && session.user.role !== "manager") {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const deleted = await ShiftScheduleModel.delete(id);

    if (!deleted) {
      return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Schedule deleted" });
  } catch (error) {
    console.error("Delete schedule error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
