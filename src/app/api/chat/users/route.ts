import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db"; 
import mongoose from "mongoose";
import type { ChatUser } from "@/types/chat.type"; 

interface UserDocument {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase();

    if (!mongoose.connection.db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 },
      );
    }

    // Query better-auth's user collection — adjust projection to match your schema
    const users = await mongoose.connection.db
      .collection<UserDocument>("user")
      .find(
        {},
        {
          projection: { id: 1, name: 1, email: 1, image: 1, _id: 0 },
        },
      )
      .toArray();

    const chatUsers: ChatUser[] = users.map((u) => ({
      id: u.id,
      name: u.name ?? "Unknown",
      email: u.email ?? "",
      image: u.image ?? "",
    }));

    return NextResponse.json({ users: chatUsers });
  } catch (err) {
    console.error("[api/chat/users] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
