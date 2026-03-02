import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import MONGODB from "@/config/db";
import { getUsersCollection } from "@/lib/messaging.db";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    const db = MONGODB;
    const users = getUsersCollection(db);

    let filter: any = {
      role: { $in: ["staff", "admin", "manager"] },
    };

    if (query && query.length >= 2) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }

    const results = await users
      .find(filter)
      .project({
        _id: 1,
        id: 1,
        name: 1,
        image: 1,
        email: 1,
        isOnline: 1,
        lastSeen: 1,
        role: 1,
      })
      .limit(20)
      .toArray();

    if (results.length > 0) {
      console.log("🔍 sample user doc fields:", Object.keys(results[0]));
      console.log("🔍 sample user doc:", JSON.stringify(results[0]));
    }

    const mapped = results
      .map((u) => ({
        id: (u.id as string) || u._id.toString(),
        name: u.name as string,
        image: (u.image as string) || null,
        email: u.email as string,
        isOnline: (u.isOnline as boolean) ?? false,
        lastSeen: (u.lastSeen as Date) || null,
        role: (u.role as string) || "staff",
      }))
      .filter((u) => u.id !== session.user.id);

    console.log("🔍 search results mapped:", JSON.stringify(mapped));

    return NextResponse.json({ users: mapped });
  } catch (error) {
    console.error("GET /api/users/search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
