import { ObjectId } from "mongodb";

// ─── Participant ──────────────────────────────────────────────────
export interface Participant {
  userId: string;
  userName: string;
  userAvatar: string;
  role: "admin" | "member";
  joinedAt: Date;
  lastReadAt?: Date;
}

// ─── Attachment ───────────────────────────────────────────────────
export type AttachmentType = "image" | "video" | "audio" | "document" | "other";

export interface Attachment {
  url: string;
  publicId?: string; // Cloudinary public ID for deletion
  type: AttachmentType;
  name: string;
  size: number; // bytes
  mimeType: string;
  thumbnailUrl?: string; // for images/videos
  width?: number;
  height?: number;
}

// ─── Message ──────────────────────────────────────────────────────
export interface Message {
  _id?: ObjectId;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string; // text (may be empty if attachments only)
  attachments: Attachment[];
  reactions: Reaction[];
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
  };
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Reaction ─────────────────────────────────────────────────────
export interface Reaction {
  emoji: string;
  userIds: string[];
}

// ─── Conversation ─────────────────────────────────────────────────
export type ConversationType = "direct" | "group";

export interface Conversation {
  _id?: ObjectId;
  type: ConversationType;
  name?: string; // group name
  avatar?: string; // group avatar
  description?: string;
  participants: Participant[];
  createdBy: string;
  lastMessage?: {
    content: string;
    senderName: string;
    sentAt: Date;
    hasAttachment: boolean;
  };
  unreadCounts: Record<string, number>; // userId → count
  pinnedMessageIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Socket payloads (matching your socket server) ───────────────
export interface ConversationsLoadedPayload {
  conversations: ConversationWithId[];
}

export interface MessagesLoadedPayload {
  conversationId: string;
  messages: MessageWithId[];
  cursor?: string;
  hasMore: boolean;
}

export interface MessageSentPayload {
  message: MessageWithId;
  conversationId: string;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface MessageReadPayload {
  conversationId: string;
  userId: string;
  lastReadAt: Date;
}

// Convenience types with string _id
export type MessageWithId = Omit<Message, "_id"> & { _id: string };
export type ConversationWithId = Omit<Conversation, "_id"> & { _id: string };