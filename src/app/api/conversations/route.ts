import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import MONGODB from "@/config/db";
import {
  getConversationsCollection,
  getMessagesCollection,
  getUsersCollection,
  findOrCreateDMConversation,
  createGroupConversation,
} from "@/lib/messaging.db";
import { headers } from "next/headers";
import { ObjectId } from "mongodb";

// ─── GET /api/conversations ───────────────────────────────────────

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const db = MONGODB;
    const conversations = getConversationsCollection(db);
    const users = getUsersCollection(db);

    const convDocs = await conversations
      .find({ participants: userId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    if (convDocs.length === 0) return NextResponse.json({ conversations: [] });

    const otherUserIds = [
      ...new Set(
        convDocs.flatMap((c) =>
          (c.participants as string[]).filter((p) => p !== userId),
        ),
      ),
    ];

    const objectIds = otherUserIds
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((id): id is ObjectId => id !== null);

    const otherUsers = await users
      .find({
        $or: [{ id: { $in: otherUserIds } }, { _id: { $in: objectIds } }],
      })
      .project({ _id: 1, id: 1, name: 1, image: 1, isOnline: 1, lastSeen: 1 })
      .toArray();

    const userMap = new Map(
      otherUsers.map((u) => [(u.id as string) || u._id.toString(), u]),
    );

    const messages = getMessagesCollection(db);

    const convIds = convDocs.map((c) => c._id.toString());
    const unreadCountsAgg = await messages
      .aggregate([
        {
          $match: {
            conversationId: { $in: convIds },
            senderId: { $ne: userId },
            "readBy.userId": { $ne: userId },
          },
        },
        {
          $group: {
            _id: "$conversationId",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const unreadMap = new Map<string, number>(
      unreadCountsAgg.map((u) => [u._id as string, u.count as number]),
    );

    const unreadCounts = convDocs.map(
      (conv) => unreadMap.get(conv._id.toString()) || 0,
    );

    interface StoredParticipant {
      userId: string;
      name: string;
      image?: string;
      lastSeen?: Date;
    }

    const result = convDocs.map((conv, i) => {
      const isGroup = conv.isGroup as boolean;
      const storedDetails = conv.participantDetails as
        | StoredParticipant[]
        | undefined;

      if (isGroup) {
        // Group: return all member details
        const members = (conv.participants as string[]).map((pid) => {
          const liveUser = userMap.get(pid);
          const stored = storedDetails?.find((d) => d.userId === pid);
          return {
            userId: pid,
            name: (liveUser?.name as string) || stored?.name || "Unknown",
            image: (liveUser?.image as string) || stored?.image || null,
            isOnline: (liveUser?.isOnline as boolean) ?? false,
            lastSeen: (liveUser?.lastSeen as Date) || stored?.lastSeen || null,
          };
        });

        return {
          _id: conv._id.toString(),
          participants: conv.participants,
          participantDetails: storedDetails ?? [],
          isGroup: true,
          groupName: conv.groupName as string,
          groupImage: (conv.groupImage as string) || null,
          adminIds: (conv.adminIds as string[]) || [],
          members,
          lastMessage: conv.lastMessage ?? null,
          unreadCount: unreadCounts[i],
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      }

      // DM: return the other participant
      const otherParticipantId = (conv.participants as string[]).find(
        (p) => p !== userId,
      )!;
      const otherUser = userMap.get(otherParticipantId);
      const storedOther = storedDetails?.find(
        (d) => d.userId === otherParticipantId,
      );

      return {
        _id: conv._id.toString(),
        participants: conv.participants,
        participantDetails: storedDetails ?? [],
        isGroup: false,
        otherParticipant: {
          userId: otherParticipantId,
          name: (otherUser?.name as string) || storedOther?.name || "Unknown",
          image: (otherUser?.image as string) || storedOther?.image || null,
          isOnline: (otherUser?.isOnline as boolean) ?? false,
          lastSeen:
            (otherUser?.lastSeen as Date) || storedOther?.lastSeen || null,
        },
        lastMessage: conv.lastMessage ?? null,
        unreadCount: unreadCounts[i],
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST /api/conversations ──────────────────────────────────────
// DM:    { targetUserId: string }
// Group: { groupName: string, memberIds: string[] }

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      targetUserId?: string;
      groupName?: string;
      memberIds?: string[];
    };

    const db = MONGODB;

    // ── Group creation ────────────────────────────────────────────
    if (body.groupName && body.memberIds) {
      const { groupName, memberIds } = body;

      if (!Array.isArray(memberIds) || memberIds.length < 1) {
        return NextResponse.json(
          { error: "Group must have at least 1 other member" },
          { status: 400 },
        );
      }

      if (groupName.trim().length < 1) {
        return NextResponse.json(
          { error: "Group name is required" },
          { status: 400 },
        );
      }

      const conversationId = await createGroupConversation(
        db,
        session.user.id,
        memberIds,
        groupName.trim(),
      );

      return NextResponse.json({ conversationId, isGroup: true });
    }

    // ── DM creation ───────────────────────────────────────────────
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

    const users = getUsersCollection(db);
    let objectId: ObjectId | null = null;
    try {
      objectId = new ObjectId(targetUserId);
    } catch {
      /* not valid ObjectId */
    }

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
    return NextResponse.json({ conversationId, isGroup: false });
  } catch (error) {
    console.error("POST /api/conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PATCH /api/conversations ─────────────────────────────────────
// Update group name, image, or add members

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      conversationId: string;
      groupName?: string;
      groupImage?: string;
      addMemberIds?: string[];
    };

    const { conversationId, groupName, groupImage, addMemberIds } = body;
    if (!conversationId)
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });

    const db = MONGODB;
    const conversations = getConversationsCollection(db);

    let convObjectId: ObjectId;
    try {
      convObjectId = new ObjectId(conversationId);
    } catch {
      return NextResponse.json({ error: "Invalid conversationId" }, { status: 400 });
    }

    const conv = await conversations.findOne({ _id: convObjectId });
    if (!conv)
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    if (!conv.isGroup)
      return NextResponse.json({ error: "Not a group conversation" }, { status: 400 });

    const userId = session.user.id;
    const isAdmin = (conv.adminIds as string[] || []).includes(userId);
    const isMember = (conv.participants as string[]).includes(userId);

    if (!isMember)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const $set: Record<string, unknown> = { updatedAt: new Date() };
    const $push: Record<string, unknown> = {};

    if ((groupName !== undefined || groupImage !== undefined) && !isAdmin)
      return NextResponse.json({ error: "Only admins can update group settings" }, { status: 403 });

    if (groupName !== undefined) $set.groupName = groupName.trim();
    if (groupImage !== undefined) $set.groupImage = groupImage;

    // Add members
    if (addMemberIds && addMemberIds.length > 0) {
      const existing = new Set(conv.participants as string[]);
      const newIds = addMemberIds.filter((id) => !existing.has(id));
      if (newIds.length > 0) {
        const users = getUsersCollection(db);
        const newUsers = await users
          .find({ $or: [{ id: { $in: newIds } }, { _id: { $in: newIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) as ObjectId[] } }] })
          .project({ id: 1, name: 1, image: 1 })
          .toArray();

        $push.participants = { $each: newIds };
        $push.participantDetails = {
          $each: newIds.map((nid) => {
            const u = newUsers.find((u) => (u.id as string) === nid || u._id.toString() === nid);
            return { userId: nid, name: (u?.name as string) || "Unknown", image: (u?.image as string) || null };
          }),
        };
      }
    }

    const update: Record<string, unknown> = { $set };
    if (Object.keys($push).length > 0) update.$push = $push;

    await conversations.updateOne({ _id: convObjectId }, update as any);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
