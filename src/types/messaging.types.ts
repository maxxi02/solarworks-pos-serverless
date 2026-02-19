import { ObjectId } from "mongodb";

// ─── Core Domain Types ────────────────────────────────────────────

export interface Conversation {
  _id: ObjectId | string;
  participants: string[];
  participantDetails: ConversationParticipant[];
  isGroup: boolean;
  groupName?: string;
  groupImage?: string;
  adminIds?: string[];
  lastMessage?: MessagePreview;
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: number;
}

export interface ConversationParticipant {
  userId: string;
  name: string;
  image?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface MessagePreview {
  content: string;
  senderId: string;
  senderName: string;
  sentAt: Date;
}

export interface Message {
  _id: ObjectId | string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  content: string;
  type: "text" | "system";
  readBy: ReadReceipt[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadReceipt {
  userId: string;
  readAt: Date;
}

// ─── API Response Types ───────────────────────────────────────────

export interface ConversationWithDetails extends Conversation {
  // For DMs — the other person
  otherParticipant?: ConversationParticipant;
  // For groups — all members
  members?: ConversationParticipant[];
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor?: string;
  hasMore: boolean;
}

// ─── Socket Event Payloads ────────────────────────────────────────

export interface DmSendPayload {
  conversationId: string;
  content: string;
  tempId: string;
}

export interface DmReceivePayload {
  message: Message;
  conversationId: string;
}

export interface DmTypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
}

export interface DmReadPayload {
  conversationId: string;
  messageIds: string[];
  userId: string;
  readAt: Date;
}

export interface DmConversationJoinPayload {
  conversationId: string;
}

// ─── Group Payloads ───────────────────────────────────────────────

export interface GroupCreatePayload {
  name: string;
  memberIds: string[];
}

export interface GroupCreatedPayload {
  conversationId: string;
  name: string;
}

// ─── UI State Types ───────────────────────────────────────────────

export interface TypingUser {
  userId: string;
  userName: string;
}

export interface MessageState {
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  nextCursor?: string;
}

export interface OptimisticMessage extends Omit<Message, "_id"> {
  _id: string;
  status: "sending" | "sent" | "failed";
  tempId: string;
}
