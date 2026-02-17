// ─── Serialized shapes returned by the socket server ─────────────

export interface SerializedLastMessage {
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string; // ISO string
}

export interface SerializedConversation {
  _id: string;
  type: "group" | "direct";
  name: string;
  slug: string;
  participants: string[];
  lastMessage?: SerializedLastMessage;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Typing indicator ─────────────────────────────────────────────

export interface TypingUser {
  userId: string;
  userName: string;
}

// ─── User shape returned from /api/chat/users ────────────────────

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  image: string;
}

// ─── Socket event payloads: Server → Client ───────────────────────

export interface ConversationsLoadedPayload {
  conversations: SerializedConversation[];
}

export interface MessagesLoadedPayload {
  conversationId: string;
  messages: SerializedMessage[];
  hasMore: boolean;
}

export interface MessageNewPayload {
  message: SerializedMessage;
  conversationId: string;
}

export interface ConversationNewPayload {
  conversation: SerializedConversation;
}

export interface DirectReadyPayload {
  conversation: SerializedConversation;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ChatErrorPayload {
  message: string;
}

// ─── useChat hook return shape ────────────────────────────────────

export interface UseChatReturn {
  conversations: SerializedConversation[];
  selectedConversationId: string | null;
  selectedConversation: SerializedConversation | null;
  messages: Record<string, SerializedMessage[]>;
  hasMoreMessages: Record<string, boolean>;
  typingUsers: Record<string, TypingUser[]>;
  localUnread: Record<string, number>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  allUsers: ChatUser[];
  isLoadingUsers: boolean;
  totalUnread: number;
  selectConversation: (id: string) => void;
  sendMessage: (content: string) => void;
  loadMoreMessages: () => void;
  startDM: (targetUser: ChatUser) => void;
  updateTyping: (isTyping: boolean) => void;
  getDisplayName: (conv: SerializedConversation) => string;
  getOtherUserAvatar: (conv: SerializedConversation) => string;
}
