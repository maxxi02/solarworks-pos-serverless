import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";
import { AttendanceRecord, EnrichedAttendance, UserBasicInfo } from "@/types/attendance";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { role } = session.user;
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 },
      );
    }

    const tempCollection =
      MONGODB.collection<AttendanceRecord>("attendance_temp");

    const records = await tempCollection
      .find({})
      .sort({ clockInTime: -1 })
      .toArray();

    // ── Prepare user lookup ─────────────────────────────────────────────
    const userIds = [...new Set(records.map((r) => String(r.userId)))].filter(
      Boolean,
    );

    const userObjectIds = userIds
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          console.warn(`Invalid userId in pending: ${id}`);
          return null;
        }
      })
      .filter((id): id is ObjectId => id !== null);

    console.log("[pending] Looking up users for IDs:", userIds);

    const usersCollection = MONGODB.collection("user");

    const users = await usersCollection
      .find({ _id: { $in: userObjectIds } })
      .toArray();

    console.log("[pending] Found users:", users.length);

    const userMap = new Map<string, UserBasicInfo>(
      users.map((user) => [
        user._id.toString(),
        {
          id: user._id.toString(),
          name: (user.name as string) || "Unnamed User",
          email: (user.email as string) || "—",
          role: (user.role as string) || "—",
        } satisfies UserBasicInfo,
      ]),
    );

    const enrichedRecords: EnrichedAttendance[] = records.map((record) => ({
      ...record,
      _id: String(record._id),
      userId: String(record.userId),
      user: userMap.get(String(record.userId)),
    }));

    return NextResponse.json({
      success: true,
      records: enrichedRecords,
    });
  } catch (error) {
    console.error("[pending] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
