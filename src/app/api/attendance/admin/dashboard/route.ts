import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";
import type {
  Attendance,
  EnrichedAttendance,
  UserBasicInfo,
} from "@/types/attendance";

interface DashboardStats {
  totalRecords: number;
  totalHours: number;
  uniqueStaff: number;
  averageHours: number;
}

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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const staffId = searchParams.get("staffId");

    const query: {
      userId?: string;
      date?: { $gte: string; $lte: string };
    } = {};

    if (staffId) {
      query.userId = staffId;
    }

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const collection = MONGODB.collection<Attendance>("attendance");

    const records = await collection
      .find(query)
      .sort({ date: -1, clockInTime: -1 })
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
          console.warn(`Invalid userId in dashboard: ${id}`);
          return null;
        }
      })
      .filter((id): id is ObjectId => id !== null);

    console.log("[dashboard] Looking up users for IDs:", userIds);

    const usersCollection = MONGODB.collection("user");

    const users = await usersCollection
      .find({ _id: { $in: userObjectIds } })
      .toArray();

    console.log("[dashboard] Found users:", users.length);

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

    // Calculate stats
    const totalHours = records.reduce(
      (sum, r) => sum + (r.hoursWorked ?? 0),
      0,
    );
    const uniqueStaff = new Set(records.map((r) => String(r.userId))).size;
    const averageHours = records.length > 0 ? totalHours / records.length : 0;

    const stats: DashboardStats = {
      totalRecords: records.length,
      totalHours: Math.round(totalHours * 100) / 100,
      uniqueStaff,
      averageHours: Math.round(averageHours * 100) / 100,
    };

    return NextResponse.json({
      success: true,
      records: enrichedRecords,
      stats,
    });
  } catch (error) {
    console.error("[dashboard] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
