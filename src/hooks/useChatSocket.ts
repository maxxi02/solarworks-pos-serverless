"use client";

import { useEffect, useCallback, useRef } from "react";
import { socketClient } from "@/lib/socket-client";
import { useChatStore } from "@/store/chatStore";
import {
  ConversationWithId,
  TypingPayload,
  MessagesLoadedPayload,
  ConversationsLoadedPayload,
  MessageSentPayload,
} from "@/types/chat.types";

interface UseChatSocketOptions {
  userId: string;
  userName: string;
  userAvatar?: string;
}

export function useChatSocket({
  userId,
  userName,
  userAvatar,
}: UseChatSocketOptions) {
  const store = useChatStore();
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const openConversationRef = useRef<(id: string) => void>(() => {});

  useEffect(() => {
    if (!userId) return;

    const socket = socketClient.connect(userId, userName, userAvatar);

    // ─── Connection ───────────────────────────────────────────
    socket.on("connect", () => {
      store.setConnected(true);
      socketClient.emitOnline();
      socketClient.emitChatConversationsLoad();
    });

    socket.on("disconnect", () => store.setConnected(false));

    // If already connected when effect runs
    if (socket.connected) {
      store.setConnected(true);
      socketClient.emitOnline();
      socketClient.emitChatConversationsLoad();
    }

    // ─── Conversations ────────────────────────────────────────
    socket.on(
      "chat:conversations:loaded",
      (data: ConversationsLoadedPayload) => {
        store.setConversations(data.conversations);
        store.setLoadingConversations(false);
      },
    );

    socket.on("chat:conversation:updated", (data: ConversationWithId) => {
      store.upsertConversation(data);
    });

    // ─── Messages ─────────────────────────────────────────────
    socket.on("chat:messages:loaded", (data: MessagesLoadedPayload) => {
      store.setMessages(
        data.conversationId,
        data.messages,
        data.hasMore,
        data.cursor,
      );
      store.setLoadingMessages(false);
    });

    socket.on("chat:message:received", (data: MessageSentPayload) => {
      store.addMessage(data.conversationId, data.message);
      store.upsertConversation({
        ...store.conversations.find((c) => c._id === data.conversationId)!,
        lastMessage: {
          content:
            data.message.content ||
            (data.message.attachments.length > 0 ? "📎 Attachment" : ""),
          senderName: data.message.senderName,
          sentAt: new Date(data.message.createdAt),
          hasAttachment: data.message.attachments.length > 0,
        },
        updatedAt: new Date(),
      } as ConversationWithId);

      if (
        data.conversationId !== store.activeConversationId &&
        data.message.senderId !== userId
      ) {
        store.incrementUnread(data.conversationId, userId);
      }
    });

    // ─── Typing ───────────────────────────────────────────────
    socket.on("chat:typing:updated", (payload: TypingPayload) => {
      if (payload.userId === userId) return;
      store.setTyping(payload);

      if (payload.isTyping) {
        const key = `${payload.conversationId}:${payload.userId}`;
        clearTimeout(typingTimers.current[key]);
        typingTimers.current[key] = setTimeout(() => {
          store.setTyping({ ...payload, isTyping: false });
        }, 4000);
      }
    });

    // ─── Read receipts ────────────────────────────────────────
    socket.on(
      "chat:messages:read:ack",
      ({ conversationId }: { conversationId: string }) => {
        store.markConversationRead(conversationId, userId);
      },
    );

    // ─── DM created ───────────────────────────────────────────
    socket.on("chat:direct:created", (data: ConversationWithId) => {
      store.upsertConversation(data);
      openConversationRef.current(data._id);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("chat:conversations:loaded");
      socket.off("chat:conversation:updated");
      socket.off("chat:messages:loaded");
      socket.off("chat:message:received");
      socket.off("chat:typing:updated");
      socket.off("chat:messages:read:ack");
      socket.off("chat:direct:created");
      Object.values(typingTimers.current).forEach(clearTimeout);
    };
  }, [userId]);

  // ─── Actions ─────────────────────────────────────────────────

  const openConversation = useCallback(
    (conversationId: string) => {
      store.setActiveConversation(conversationId);
      store.setLoadingMessages(true);
      socketClient.emitChatMessagesLoad(conversationId);
      socketClient.emitChatMessagesRead(conversationId);
      store.markConversationRead(conversationId, userId);
    },
    [userId, store],
  );

  useEffect(() => {
    openConversationRef.current = openConversation;
  }, [openConversation]);

  const loadMoreMessages = useCallback(
    (conversationId: string) => {
      const cursor = store.cursors[conversationId];
      socketClient.emitChatMessagesLoad(conversationId, cursor);
    },
    [store.cursors],
  );

  const sendMessage = useCallback((conversationId: string, content: string) => {
    socketClient.emitChatMessageSend(conversationId, content);
  }, []);

  const openDM = useCallback(
    (
      targetUserId: string,
      targetUserName: string,
      targetUserAvatar?: string,
    ) => {
      const existing = store.conversations.find(
        (c) =>
          c.type === "direct" &&
          c.participants.some((p) => p.userId === targetUserId),
      );
      if (existing) {
        openConversation(existing._id);
        return;
      }
      socketClient.emitChatDirectGetOrCreate(
        targetUserId,
        targetUserName,
        targetUserAvatar,
      );
    },
    [store.conversations, openConversation],
  );

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTyping = useCallback((conversationId: string) => {
    socketClient.emitChatTypingUpdate(conversationId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketClient.emitChatTypingUpdate(conversationId, false);
    }, 2500);
  }, []);

  return {
    openConversation,
    loadMoreMessages,
    sendMessage,
    openDM,
    handleTyping,
  };
}
