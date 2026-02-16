import { ObjectId } from "mongodb";

export type ChatRoomType = "private" | "group";

export interface ChatRoom {
  _id: ObjectId;
  type: ChatRoomType;
  participants: string[]; // user ids
  name?: string; // only for groups
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: {
    senderId: string;
    content: string;
    sentAt: Date;
  };
}

export interface Message {
  _id: ObjectId;
  roomId: ObjectId;
  senderId: string;
  content: string;
  sentAt: Date;
  readBy: string[]; // user ids who read it
}

export interface TypingPayload {
  roomId: string;
  userId: string;
  isTyping: boolean;
}

export interface ReadReceiptPayload {
  roomId: string;
  messageId: string;
  userId: string;
}

// Client-facing message (with sender info populated if needed)
export interface ClientMessage extends Omit<Message, "_id" | "roomId"> {
  id: string;
  sender: {
    id: string;
    name?: string; // optional - fetch on frontend if you want avatars/names
  };
}
