// app/api/attendance/admin/staff-list/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin or manager
    const userRole = session.user.role;
    if (userRole !== "admin" && userRole !== "manager") {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Admin or Manager role required.",
        },
        { status: 403 }
      );
    }

    // Get all staff members (exclude admins if needed)
    const usersCollection = MONGODB.collection("user");
    const staff = await usersCollection
      .find(
        { role: { $in: ["staff", "manager"] } },
        { projection: { _id: 1, name: 1, email: 1, role: 1 } }
      )
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      staff: staff.map((s) => ({
        id: s._id.toString(), // 🔥 FIX: Use _id as the id
        name: s.name,
        email: s.email,
        role: s.role,
      })),
    });
  } catch (error) {
    console.error("Get staff list error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}