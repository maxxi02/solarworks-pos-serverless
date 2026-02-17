import { NextRequest, NextResponse } from "next/server";
import MONGODB from "@/config/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await MONGODB.collection("user")
      .find(
        {},
        { projection: { _id: 1, name: 1, image: 1, role: 1, email: 1 } },
      )
      .toArray();

    return NextResponse.json(
      users.map((u) => ({
        id: u._id.toString(),
        name: u.name ?? u.email ?? "Unknown",
        image: u.image ?? null,
        role: u.role ?? "user",
      })),
    );
  } catch (err) {
    console.error("Get users error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
