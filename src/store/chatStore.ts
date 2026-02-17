import { create } from "zustand";
import {
  ConversationWithId,
  MessageWithId,
  TypingPayload,
} from "@/types/chat.types";

interface UploadingFile {
  id: string; // local temp id
  name: string;
  progress: number;
  previewUrl?: string;
  mimeType: string;
  size: number;
}

interface ChatStore {
  // ─── State ─────────────────────────────────────────────────────
  conversations: ConversationWithId[];
  activeConversationId: string | null;
  messages: Record<string, MessageWithId[]>; // conversationId → messages
  hasMore: Record<string, boolean>;
  cursors: Record<string, string | undefined>;
  typingUsers: Record<string, TypingPayload[]>; // conversationId → users
  uploadingFiles: UploadingFile[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isConnected: boolean;
  searchQuery: string;

  // ─── Conversation actions ────────────────────────────────────
  setConversations: (conversations: ConversationWithId[]) => void;
  upsertConversation: (conversation: ConversationWithId) => void;
  setActiveConversation: (id: string | null) => void;
  setSearchQuery: (query: string) => void;

  // ─── Message actions ─────────────────────────────────────────
  setMessages: (
    conversationId: string,
    messages: MessageWithId[],
    hasMore: boolean,
    cursor?: string,
  ) => void;
  prependMessages: (
    conversationId: string,
    messages: MessageWithId[],
    hasMore: boolean,
    cursor?: string,
  ) => void;
  addMessage: (conversationId: string, message: MessageWithId) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updates: Partial<MessageWithId>,
  ) => void;

  // ─── Typing ──────────────────────────────────────────────────
  setTyping: (payload: TypingPayload) => void;

  // ─── Upload ──────────────────────────────────────────────────
  addUploadingFile: (file: UploadingFile) => void;
  updateUploadProgress: (id: string, progress: number) => void;
  removeUploadingFile: (id: string) => void;
  clearUploadingFiles: () => void;

  // ─── Connection ──────────────────────────────────────────────
  setConnected: (connected: boolean) => void;
  setLoadingConversations: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;

  // ─── Unread ──────────────────────────────────────────────────
  markConversationRead: (conversationId: string, userId: string) => void;
  incrementUnread: (conversationId: string, userId: string) => void;

  // ─── Derived ────────────────────────────────────────────────
  getActiveConversation: () => ConversationWithId | undefined;
  getFilteredConversations: () => ConversationWithId[];
  getTotalUnread: (userId: string) => number;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  hasMore: {},
  cursors: {},
  typingUsers: {},
  uploadingFiles: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isConnected: false,
  searchQuery: "",

  setConversations: (conversations) => set({ conversations }),

  upsertConversation: (conversation) =>
    set((state) => {
      const idx = state.conversations.findIndex(
        (c) => c._id === conversation._id,
      );
      if (idx >= 0) {
        const updated = [...state.conversations];
        updated[idx] = conversation;
        // Re-sort by updatedAt desc
        updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        return { conversations: updated };
      }
      return {
        conversations: [conversation, ...state.conversations].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  setMessages: (conversationId, messages, hasMore, cursor) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
      hasMore: { ...state.hasMore, [conversationId]: hasMore },
      cursors: { ...state.cursors, [conversationId]: cursor },
    })),

  prependMessages: (conversationId, messages, hasMore, cursor) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [
          ...messages,
          ...(state.messages[conversationId] ?? []),
        ],
      },
      hasMore: { ...state.hasMore, [conversationId]: hasMore },
      cursors: { ...state.cursors, [conversationId]: cursor },
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    })),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
          m._id === messageId ? { ...m, ...updates } : m,
        ),
      },
    })),

  setTyping: (payload) =>
    set((state) => {
      const current = state.typingUsers[payload.conversationId] ?? [];
      const filtered = current.filter((t) => t.userId !== payload.userId);
      const next = payload.isTyping ? [...filtered, payload] : filtered;
      return {
        typingUsers: { ...state.typingUsers, [payload.conversationId]: next },
      };
    }),

  addUploadingFile: (file) =>
    set((state) => ({ uploadingFiles: [...state.uploadingFiles, file] })),

  updateUploadProgress: (id, progress) =>
    set((state) => ({
      uploadingFiles: state.uploadingFiles.map((f) =>
        f.id === id ? { ...f, progress } : f,
      ),
    })),

  removeUploadingFile: (id) =>
    set((state) => ({
      uploadingFiles: state.uploadingFiles.filter((f) => f.id !== id),
    })),

  clearUploadingFiles: () => set({ uploadingFiles: [] }),

  setConnected: (connected) => set({ isConnected: connected }),
  setLoadingConversations: (loading) =>
    set({ isLoadingConversations: loading }),
  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

  markConversationRead: (conversationId, userId) =>
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c._id !== conversationId) return c;
        return {
          ...c,
          unreadCounts: { ...c.unreadCounts, [userId]: 0 },
        };
      }),
    })),

  incrementUnread: (conversationId, userId) =>
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c._id !== conversationId) return c;
        const prev = c.unreadCounts?.[userId] ?? 0;
        return {
          ...c,
          unreadCounts: { ...c.unreadCounts, [userId]: prev + 1 },
        };
      }),
    })),

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c._id === activeConversationId);
  },

  getFilteredConversations: () => {
    const { conversations, searchQuery } = get();
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.participants.some((p) => p.userName.toLowerCase().includes(q)),
    );
  },

  getTotalUnread: (userId) => {
    const { conversations } = get();
    return conversations.reduce(
      (sum, c) => sum + (c.unreadCounts?.[userId] ?? 0),
      0,
    );
  },
}));
