import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import MONGODB from "@/config/db";
import {
  getConversationsCollection,
  getMessagesCollection,
  getUsersCollection,
  findOrCreateDMConversation,
} from "@/lib/messaging.db";
import { headers } from "next/headers";
import { ObjectId } from "mongodb";

// ─── GET /api/conversations ───────────────────────────────────────

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const db = MONGODB;
    const conversations = getConversationsCollection(db);
    const users = getUsersCollection(db);

    const convDocs = await conversations
      .find({ participants: userId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    if (convDocs.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const otherUserIds = [
      ...new Set(
        convDocs.flatMap((c) =>
          (c.participants as string[]).filter((p) => p !== userId),
        ),
      ),
    ];

    // Type predicate ensures ObjectId[] not (ObjectId | null)[]
    const objectIds = otherUserIds
      .map((id) => {
        try { return new ObjectId(id); } catch { return null; }
      })
      .filter((id): id is ObjectId => id !== null);

    const otherUsers = await users
      .find({
        $or: [
          { id: { $in: otherUserIds } },
          { _id: { $in: objectIds } },
        ],
      })
      .project({ _id: 1, id: 1, name: 1, image: 1, isOnline: 1, lastSeen: 1 })
      .toArray();

    const userMap = new Map(
      otherUsers.map((u) => [(u.id as string) || u._id.toString(), u]),
    );

    const messages = getMessagesCollection(db);

    const unreadCounts = await Promise.all(
      convDocs.map((conv) =>
        messages.countDocuments({
          conversationId: conv._id.toString(),
          senderId: { $ne: userId },
          "readBy.userId": { $ne: userId },
        }),
      ),
    );

    interface StoredParticipant {
      userId: string;
      name: string;
      image?: string;
      lastSeen?: Date;
    }

    const result = convDocs.map((conv, i) => {
      const otherParticipantId = (conv.participants as string[]).find(
        (p) => p !== userId,
      )!;
      const otherUser = userMap.get(otherParticipantId);
      const storedDetails = (conv.participantDetails as StoredParticipant[] | undefined)
        ?.find((d) => d.userId === otherParticipantId);

      return {
        _id: conv._id.toString(),
        participants: conv.participants,
        otherParticipant: {
          userId: otherParticipantId,
          name: (otherUser?.name as string) || storedDetails?.name || "Unknown",
          image: (otherUser?.image as string) || storedDetails?.image || null,
          isOnline: (otherUser?.isOnline as boolean) ?? false,
          lastSeen: (otherUser?.lastSeen as Date) || storedDetails?.lastSeen || null,
        },
        lastMessage: conv.lastMessage
          ? {
              ...(conv.lastMessage as object),
              sentAt: (conv.lastMessage as { sentAt: Date }).sentAt,
            }
          : null,
        unreadCount: unreadCounts[i],
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/conversations ──────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { targetUserId?: unknown };
    console.log("POST /api/conversations body:", body);

    const { targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json(
        { error: "targetUserId is required" },
        { status: 400 },
      );
    }

    if (targetUserId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot message yourself" },
        { status: 400 },
      );
    }

    const db = MONGODB;
    const users = getUsersCollection(db);

    let objectId: ObjectId | null = null;
    try { objectId = new ObjectId(targetUserId); } catch { /* not valid ObjectId */ }

    const targetUser = await users.findOne(
      objectId
        ? { $or: [{ id: targetUserId }, { _id: objectId }] }
        : { id: targetUserId },
    );

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conversationId = await findOrCreateDMConversation(
      db,
      session.user.id,
      targetUserId,
    );

    return NextResponse.json({ conversationId });
  } catch (error) {
    console.error("POST /api/conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}