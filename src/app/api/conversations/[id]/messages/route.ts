import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import MONGODB from "@/config/db";
import {
  getConversationsCollection,
  getMessagesCollection,
} from "@/lib/messaging.db";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";

const PAGE_SIZE = 30;

// ─── GET /api/conversations/[id]/messages ─────────────────────────
// Paginated message history. Use ?cursor=<messageId> for older pages.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor"); // last message _id for pagination

    const db = MONGODB;
    const conversations = getConversationsCollection(db);

    // Verify access
    let convObjectId: ObjectId;
    try {
      convObjectId = new ObjectId(conversationId);
    } catch {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 },
      );
    }

    const conversation = await conversations.findOne({
      _id: convObjectId,
      participants: session.user.id,
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const messages = getMessagesCollection(db);

    // Build query — if cursor provided, get messages older than that ID
    const query: Record<string, unknown> = { conversationId };
    if (cursor) {
      try {
        query._id = { $lt: new ObjectId(cursor) };
      } catch {
        return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
      }
    }

    const docs = await messages
      .find(query)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE + 1) // fetch one extra to determine if there's more
      .toArray();

    const hasMore = docs.length > PAGE_SIZE;
    const page = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

    // Return in ascending order (oldest first for chat display)
    const ordered = page.reverse();

    return NextResponse.json({
      messages: ordered.map((m) => ({
        ...m,
        _id: m._id.toString(),
      })),
      nextCursor: hasMore ? ordered[0]._id.toString() : undefined,
      hasMore,
    });
  } catch (error) {
    console.error("GET /api/conversations/[id]/messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
