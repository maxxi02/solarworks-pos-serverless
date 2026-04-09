import { NextRequest, NextResponse } from "next/server";
import MONGODB from "@/config/db";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (!auth.authorized) return auth.response!;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const collection = MONGODB.collection("user");

    // 1. Base filter: role is staff or manager
    const baseFilter: Record<string, any> = {
      role: { $in: ["staff", "manager"] },
      isAnonymous: { $ne: true },
    };

    // 2. Search filter
    if (search) {
      baseFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // 3. Build Projection
    const projection = {
      _id: 1,
      id: 1,
      name: 1,
      email: 1,
      image: 1,
      phoneNumber: 1,
      emailVerified: 1,
      createdAt: 1,
      lastActive: 1,
      banned: 1,
      role: 1,
      isOnline: 1,
      isAnonymous: 1,
    };

    // 4. Fetch Staff
    const staff = await collection
      .find(baseFilter, { projection })
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("Staff fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch staff" },
      { status: 500 },
    );
  }
}
