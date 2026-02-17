"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { socketClient } from "@/lib/socket-client";
import {
  ChatUser,
  SerializedConversation,
  SerializedMessage,
  TypingUser,
  UseChatReturn,
} from "@/types/chat.type";
import { useSession } from "@/lib/auth-client";

// Define missing payload types
interface ConversationsLoadedPayload {
  conversations: SerializedConversation[];
}

interface MessagesLoadedPayload {
  conversationId: string;
  messages: SerializedMessage[];
  hasMore: boolean;
}

interface MessageNewPayload {
  message: SerializedMessage;
  conversationId: string;
}

interface ConversationNewPayload {
  conversation: SerializedConversation;
}

interface DirectReadyPayload {
  conversation: SerializedConversation;
}

interface TypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

const TYPING_DEBOUNCE_MS = 2000;

export function useChat(): UseChatReturn {
  const { data: session } = useSession();
  const currentUser = session?.user;

  // ─── State ───────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<SerializedConversation[]>(
    [],
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Record<string, SerializedMessage[]>>(
    {},
  );
  const [hasMoreMessages, setHasMoreMessages] = useState<
    Record<string, boolean>
  >({});
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser[]>>(
    {},
  );
  const [localUnread, setLocalUnread] = useState<Record<string, number>>({});
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Ref so event callbacks always see the latest selected conversation without re-subscribing
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedConversationId;

  // Typing debounce timer
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch all users (for DM picker) ─────────────────────────────
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/chat/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = (await res.json()) as { users: ChatUser[] };
        setAllUsers(data.users);
      } catch (err) {
        console.error("[useChat] fetchUsers:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // ─── Socket event handlers ────────────────────────────────────────
  useEffect(() => {
    const handleConversationsLoaded = (payload: ConversationsLoadedPayload) => {
      setConversations(payload.conversations);
      setIsLoadingConversations(false);
    };

    const handleMessagesLoaded = (payload: MessagesLoadedPayload) => {
      setIsLoadingMessages(false);
      setHasMoreMessages((prev) => ({
        ...prev,
        [payload.conversationId]: payload.hasMore,
      }));

      setMessages((prev) => {
        const existing = prev[payload.conversationId];

        // If we already have messages and incoming messages are older → prepend (load more)
        if (
          existing?.length &&
          payload.messages.length &&
          new Date(payload.messages[payload.messages.length - 1].createdAt) <
            new Date(existing[0].createdAt)
        ) {
          return {
            ...prev,
            [payload.conversationId]: [...payload.messages, ...existing],
          };
        }

        // Otherwise it's a fresh load → replace
        return { ...prev, [payload.conversationId]: payload.messages };
      });
    };

    const handleMessageNew = (payload: MessageNewPayload) => {
      const { message, conversationId } = payload;

      // Append message to its conversation thread
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), message],
      }));

      // Bump lastMessage on the conversation card
      setConversations((prev) =>
        prev
          .map((c) =>
            c._id === conversationId
              ? {
                  ...c,
                  lastMessage: {
                    content: message.content,
                    senderId: message.senderId,
                    senderName: message.senderName,
                    timestamp: message.createdAt,
                  },
                  updatedAt: message.createdAt,
                }
              : c,
          )
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
      );

      // Track unread only for conversations not currently open
      const isCurrentConv = selectedIdRef.current === conversationId;
      const isOwnMessage = message.senderId === currentUser?.id;

      if (!isCurrentConv && !isOwnMessage) {
        setLocalUnread((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? 0) + 1,
        }));
      }

      // If this conversation IS open, immediately mark read on server
      if (isCurrentConv) {
        socketClient.emitChatMessagesRead(conversationId);
      }
    };

    const handleConversationNew = (payload: ConversationNewPayload) => {
      setConversations((prev) => {
        const alreadyExists = prev.some(
          (c) => c._id === payload.conversation._id,
        );
        if (alreadyExists) return prev;
        return [payload.conversation, ...prev];
      });
    };

    const handleDirectReady = (payload: DirectReadyPayload) => {
      const conv = payload.conversation;

      setConversations((prev) => {
        const alreadyExists = prev.some((c) => c._id === conv._id);
        if (alreadyExists) return prev;
        return [conv, ...prev];
      });

      // Auto-select the new DM
      setSelectedConversationId(conv._id);
    };

    const handleTyping = (payload: TypingPayload) => {
      setTypingUsers((prev) => {
        const current = prev[payload.conversationId] ?? [];

        if (payload.isTyping) {
          const alreadyIn = current.some((u) => u.userId === payload.userId);
          if (alreadyIn) return prev;
          return {
            ...prev,
            [payload.conversationId]: [
              ...current,
              { userId: payload.userId, userName: payload.userName },
            ],
          };
        } else {
          return {
            ...prev,
            [payload.conversationId]: current.filter(
              (u) => u.userId !== payload.userId,
            ),
          };
        }
      });
    };

    // Register event handlers
    socketClient.onChatConversationsLoaded(handleConversationsLoaded);
    socketClient.onChatMessagesLoaded(handleMessagesLoaded);
    socketClient.onChatMessageNew(handleMessageNew);
    socketClient.onChatConversationNew(handleConversationNew);
    socketClient.onChatDirectReady(handleDirectReady);
    socketClient.onChatTyping(handleTyping);

    return () => {
      // Clean up event handlers
      socketClient.offChatConversationsLoaded(handleConversationsLoaded);
      socketClient.offChatMessagesLoaded(handleMessagesLoaded);
      socketClient.offChatMessageNew(handleMessageNew);
      socketClient.offChatConversationNew(handleConversationNew);
      socketClient.offChatDirectReady(handleDirectReady);
      socketClient.offChatTyping(handleTyping);
    };
  }, [currentUser?.id]);

  // ─── Load conversations on connect / reconnect ────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;

    const load = () => {
      setIsLoadingConversations(true);
      socketClient.emitChatConversationsLoad();
    };

    // If already connected, load immediately
    if (socketClient.isConnected()) {
      load();
    }

    // Also reload after reconnects
    const socket = socketClient.getSocket();
    socket?.on("connect", load);

    return () => {
      socket?.off("connect", load);
    };
  }, [currentUser?.id]);

  // ─── Load messages when conversation selected ─────────────────────
  useEffect(() => {
    if (!selectedConversationId) return;

    setIsLoadingMessages(true);
    socketClient.emitChatMessagesLoad(selectedConversationId);
    socketClient.emitChatMessagesRead(selectedConversationId);

    // Clear unread badge for this conversation
    setLocalUnread((prev) => ({ ...prev, [selectedConversationId]: 0 }));
  }, [selectedConversationId]);

  // ─── Actions ─────────────────────────────────────────────────────

  const selectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      if (!selectedConversationId || !content.trim()) return;

      // Stop typing indicator on send
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      socketClient.emitChatTypingUpdate(selectedConversationId, false);

      socketClient.emitChatMessageSend(selectedConversationId, content.trim());
    },
    [selectedConversationId],
  );

  const loadMoreMessages = useCallback(() => {
    if (!selectedConversationId) return;
    const msgs = messages[selectedConversationId];
    if (!msgs?.length) return;

    const cursor = msgs[0]._id; // oldest message is the cursor
    socketClient.emitChatMessagesLoad(selectedConversationId, cursor);
  }, [selectedConversationId, messages]);

  const startDM = useCallback((targetUser: ChatUser) => {
    socketClient.emitChatDirectGetOrCreate(
      targetUser.id,
      targetUser.name,
      targetUser.image,
    );
  }, []);

  const updateTyping = useCallback(
    (isTyping: boolean) => {
      if (!selectedConversationId) return;

      if (isTyping) {
        socketClient.emitChatTypingUpdate(selectedConversationId, true);

        // Auto-stop after debounce window
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          socketClient.emitChatTypingUpdate(selectedConversationId, false);
        }, TYPING_DEBOUNCE_MS);
      } else {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        socketClient.emitChatTypingUpdate(selectedConversationId, false);
      }
    },
    [selectedConversationId],
  );

  // ─── Derived helpers ──────────────────────────────────────────────

  const getDisplayName = useCallback(
    (conv: SerializedConversation): string => {
      if (conv.type === "group") return conv.name;
      const otherId = conv.participants.find((id) => id !== currentUser?.id);
      const other = allUsers.find((u) => u.id === otherId);
      return other?.name ?? conv.name;
    },
    [allUsers, currentUser?.id],
  );

  const getOtherUserAvatar = useCallback(
    (conv: SerializedConversation): string => {
      if (conv.type === "group") return "";
      const otherId = conv.participants.find((id) => id !== currentUser?.id);
      const other = allUsers.find((u) => u.id === otherId);
      return other?.image ?? "";
    },
    [allUsers, currentUser?.id],
  );

  const selectedConversation = useMemo(
    () => conversations.find((c) => c._id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const totalUnread = useMemo(
    () => Object.values(localUnread).reduce((sum, n) => sum + n, 0),
    [localUnread],
  );

  return {
    conversations,
    selectedConversationId,
    selectedConversation,
    messages,
    hasMoreMessages,
    typingUsers,
    localUnread,
    isLoadingConversations,
    isLoadingMessages,
    allUsers,
    isLoadingUsers,
    totalUnread,
    selectConversation,
    sendMessage,
    loadMoreMessages,
    startDM,
    updateTyping,
    getDisplayName,
    getOtherUserAvatar,
  };
}
