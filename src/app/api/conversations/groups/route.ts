import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import MONGODB from "@/config/db";
import { auth } from "@/lib/auth";
import { Conversation } from "@/types/chat.types";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create group conversations
    const user = session.user as {
      id: string;
      name: string;
      image?: string;
      role?: string;
    };
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can create group chats" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { name, description, participantIds, avatar } = body as {
      name: string;
      description?: string;
      participantIds: string[];
      avatar?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 },
      );
    }

    if (!participantIds?.length) {
      return NextResponse.json(
        { error: "At least one participant is required" },
        { status: 400 },
      );
    }

    // Fetch participant info from users collection
    const usersCollection = MONGODB.collection("user");
    const allParticipantIds = [...new Set([user.id, ...participantIds])];

    const users = await usersCollection
      .find({ _id: { $in: allParticipantIds.map((id) => new ObjectId(id)) } })
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const participants = allParticipantIds.map((uid) => {
      const u = userMap.get(uid);
      return {
        userId: uid,
        userName: u?.name ?? "Unknown",
        userAvatar: u?.image ?? "",
        role: uid === user.id ? "admin" : ("member" as const),
        joinedAt: new Date(),
        lastReadAt: new Date(),
      };
    });

    const now = new Date();
    const conversation: Conversation = {
      type: "group",
      name: name.trim(),
      description: description?.trim(),
      avatar: avatar ?? "",
      participants,
      createdBy: user.id,
      unreadCounts: Object.fromEntries(allParticipantIds.map((id) => [id, 0])),
      pinnedMessageIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const result =
      await MONGODB.collection<Conversation>("conversations").insertOne(
        conversation,
      );

    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...conversation,
    });
  } catch (err) {
    console.error("Create group error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string };
    const conversations = await MONGODB.collection("conversations")
      .find({
        "participants.userId": user.id,
        type: "group",
      })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(
      conversations.map((c) => ({ ...c, _id: c._id.toString() })),
    );
  } catch (err) {
    console.error("Get groups error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
