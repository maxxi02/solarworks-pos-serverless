import { Db, ObjectId } from "mongodb";

export const COLLECTIONS = {
  CONVERSATIONS: "conversations",
  MESSAGES: "messages",
  USERS: "user",
} as const;

export async function ensureMessagingIndexes(db: Db): Promise<void> {
  await db
    .collection(COLLECTIONS.CONVERSATIONS)
    .createIndex({ participants: 1 }, { background: true });
  await db
    .collection(COLLECTIONS.CONVERSATIONS)
    .createIndex({ participants: 1, updatedAt: -1 }, { background: true });
  await db
    .collection(COLLECTIONS.MESSAGES)
    .createIndex({ conversationId: 1, createdAt: -1 }, { background: true });
  await db
    .collection(COLLECTIONS.MESSAGES)
    .createIndex(
      { conversationId: 1, "readBy.userId": 1 },
      { background: true },
    );
  console.log("✅ Messaging indexes ensured");
}

export function getConversationsCollection(db: Db) {
  return db.collection(COLLECTIONS.CONVERSATIONS);
}

export function getMessagesCollection(db: Db) {
  return db.collection(COLLECTIONS.MESSAGES);
}

export function getUsersCollection(db: Db) {
  return db.collection(COLLECTIONS.USERS);
}

// ─── User Resolution ──────────────────────────────────────────────

export async function resolveUser(db: Db, userId: string) {
  const users = getUsersCollection(db);
  let user = await users.findOne({ id: userId });
  if (user) return { user, resolvedId: userId };
  try {
    user = await users.findOne({ _id: new ObjectId(userId) });
    if (user) return { user, resolvedId: user._id.toString() };
  } catch {
    /* not a valid ObjectId */
  }
  return { user: null, resolvedId: userId };
}

// ─── DM Conversation ──────────────────────────────────────────────

export async function findOrCreateDMConversation(
  db: Db,
  userAId: string,
  userBId: string,
): Promise<string> {
  const conversations = getConversationsCollection(db);

  const [resA, resB] = await Promise.all([
    resolveUser(db, userAId),
    resolveUser(db, userBId),
  ]);

  const idA = resA.resolvedId;
  const idB = resB.resolvedId;

  const existing = await conversations.findOne({
    participants: { $all: [idA, idB], $size: 2 },
    isGroup: false,
  });

  if (existing) return existing._id.toString();

  const now = new Date();
  const result = await conversations.insertOne({
    participants: [idA, idB],
    participantDetails: [
      {
        userId: idA,
        name: (resA.user?.name as string) || "Unknown",
        image: (resA.user?.image as string) || null,
        isOnline: (resA.user?.isOnline as boolean) || false,
        lastSeen: (resA.user?.lastSeen as Date) || now,
      },
      {
        userId: idB,
        name: (resB.user?.name as string) || "Unknown",
        image: (resB.user?.image as string) || null,
        isOnline: (resB.user?.isOnline as boolean) || false,
        lastSeen: (resB.user?.lastSeen as Date) || now,
      },
    ],
    isGroup: false,
    lastMessage: null,
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toString();
}

// ─── Group Conversation ───────────────────────────────────────────

export async function createGroupConversation(
  db: Db,
  creatorId: string,
  memberIds: string[],
  groupName: string,
): Promise<string> {
  const conversations = getConversationsCollection(db);

  // Resolve all members including creator
  const allIds = [...new Set([creatorId, ...memberIds])];
  const resolved = await Promise.all(allIds.map((id) => resolveUser(db, id)));

  const participants = resolved.map((r) => r.resolvedId);
  const creatorResolved = resolved.find(
    (r) => r.resolvedId === creatorId || r.user?._id.toString() === creatorId,
  );
  const creatorResolvedId = creatorResolved?.resolvedId ?? creatorId;

  const now = new Date();

  const result = await conversations.insertOne({
    participants,
    participantDetails: resolved.map((r) => ({
      userId: r.resolvedId,
      name: (r.user?.name as string) || "Unknown",
      image: (r.user?.image as string) || null,
      isOnline: (r.user?.isOnline as boolean) || false,
      lastSeen: (r.user?.lastSeen as Date) || now,
    })),
    isGroup: true,
    groupName,
    groupImage: null,
    adminIds: [creatorResolvedId], // creator is admin
    lastMessage: null,
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toString();
}

// ─── Insert Message ───────────────────────────────────────────────

export async function insertMessage(
  db: Db,
  data: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderImage?: string;
    content: string;
    type?: "text" | "system";
  },
) {
  const messages = getMessagesCollection(db);
  const conversations = getConversationsCollection(db);
  const now = new Date();

  const messageDoc = {
    conversationId: data.conversationId,
    senderId: data.senderId,
    senderName: data.senderName,
    senderImage: data.senderImage || null,
    content: data.content,
    type: data.type ?? "text",
    readBy: [{ userId: data.senderId, readAt: now }],
    createdAt: now,
    updatedAt: now,
  };

  const result = await messages.insertOne(messageDoc);

  await conversations.updateOne(
    { _id: new ObjectId(data.conversationId) },
    {
      $set: {
        lastMessage: {
          content: data.content,
          senderId: data.senderId,
          senderName: data.senderName,
          sentAt: now,
        },
        updatedAt: now,
      },
    },
  );

  return { ...messageDoc, _id: result.insertedId };
}

// ─── Mark Messages as Read ────────────────────────────────────────

export async function markMessagesAsRead(
  db: Db,
  conversationId: string,
  userId: string,
): Promise<string[]> {
  const messages = getMessagesCollection(db);
  const now = new Date();

  const unread = await messages
    .find({
      conversationId,
      senderId: { $ne: userId },
      "readBy.userId": { $ne: userId },
    })
    .project({ _id: 1 })
    .toArray();

  if (unread.length === 0) return [];

  const ids = unread.map((m) => m._id);

  await messages.updateMany(
    { _id: { $in: ids } },
    { $push: { readBy: { userId, readAt: now } } as any },
  );

  return ids.map((id) => id.toString());
}
