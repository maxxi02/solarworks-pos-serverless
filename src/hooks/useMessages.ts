"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { socketClient } from "@/lib/socket-client"; // ← your existing singleton
import type {
  Message,
  OptimisticMessage,
  DmReceivePayload,
  DmReadPayload,
  DmTypingPayload,
  TypingUser,
} from "@/types/messaging.types";

type DisplayMessage = Message | OptimisticMessage;

export function useMessages(conversationId: string | null, currentUserId: string) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ── Fetch initial messages ────────────────────────────────────
  const fetchMessages = useCallback(async (convId: string) => {
    setIsLoading(true);
    setMessages([]);
    setNextCursor(undefined);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json() as { messages: Message[]; hasMore: boolean; nextCursor?: string };
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Load older messages ───────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore || !nextCursor) return;
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages?cursor=${nextCursor}`);
      if (!res.ok) throw new Error("Failed to fetch older messages");
      const data = await res.json() as { messages: Message[]; hasMore: boolean; nextCursor?: string };
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error(err);
    }
  }, [conversationId, hasMore, nextCursor]);

  // ── Join/leave conversation room + fetch on change ────────────
  useEffect(() => {
    if (!conversationId) return;

    const socket = socketClient.getSocket();
    if (!socket) {
      console.warn("⚠️ useMessages: socket not ready");
      return;
    }

    console.log("✅ joining conversation:", conversationId);
    socket.emit("dm:conversation:join", { conversationId });
    fetchMessages(conversationId);

    return () => {
      socket.emit("dm:conversation:leave", { conversationId });
      socket.emit("dm:typing:stop", { conversationId });
    };
  }, [conversationId, fetchMessages]);

  // ── Real-time socket events ───────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const socket = socketClient.getSocket();
    if (!socket) return;

    const handleReceive = (payload: DmReceivePayload) => {
      if (payload.conversationId !== conversationId) return;
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === payload.message._id);
        if (exists) return prev;
        return [...prev, payload.message];
      });
      if (payload.message.senderId !== currentUserId) {
        socket.emit("dm:read", { conversationId });
      }
    };

    const handleSent = (data: { tempId: string; messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if ("tempId" in m && m.tempId === data.tempId) {
            return { ...m, _id: data.messageId, status: "sent" } as OptimisticMessage;
          }
          return m;
        })
      );
    };

    const handleRead = (payload: DmReadPayload) => {
      if (payload.conversationId !== conversationId) return;
      const readSet = new Set(payload.messageIds);
      setMessages((prev) =>
        prev.map((m) => {
          if (!readSet.has(m._id as string)) return m;
          const alreadyRead = (m.readBy || []).some((r) => r.userId === payload.userId);
          if (alreadyRead) return m;
          return {
            ...m,
            readBy: [...(m.readBy || []), { userId: payload.userId, readAt: new Date(payload.readAt) }],
          };
        })
      );
    };

    const handleTypingStart = (payload: DmTypingPayload) => {
      if (payload.conversationId !== conversationId) return;
      if (payload.userId === currentUserId) return;
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === payload.userId)) return prev;
        return [...prev, { userId: payload.userId, userName: payload.userName }];
      });
      const key = payload.userId;
      if (typingTimers.current.has(key)) clearTimeout(typingTimers.current.get(key)!);
      typingTimers.current.set(key, setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== key));
        typingTimers.current.delete(key);
      }, 4000));
    };

    const handleTypingStop = (payload: DmTypingPayload) => {
      if (payload.conversationId !== conversationId) return;
      const key = payload.userId;
      if (typingTimers.current.has(key)) clearTimeout(typingTimers.current.get(key)!);
      typingTimers.current.delete(key);
      setTypingUsers((prev) => prev.filter((u) => u.userId !== key));
    };

    socket.on("dm:receive", handleReceive);
    socket.on("dm:sent", handleSent);
    socket.on("dm:read", handleRead);
    socket.on("dm:typing:start", handleTypingStart);
    socket.on("dm:typing:stop", handleTypingStop);

    return () => {
      socket.off("dm:receive", handleReceive);
      socket.off("dm:sent", handleSent);
      socket.off("dm:read", handleRead);
      socket.off("dm:typing:start", handleTypingStart);
      socket.off("dm:typing:stop", handleTypingStop);
    };
  }, [conversationId, currentUserId]);

  // ── Send a message (optimistic) ───────────────────────────────
  const sendMessage = useCallback(
    (content: string, senderName: string, senderImage?: string) => {
      if (!conversationId || !content.trim()) return;

      const socket = socketClient.getSocket();
      if (!socket?.connected) {
        console.warn("⚠️ Cannot send: socket not connected");
        return;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;

      const optimistic: OptimisticMessage = {
        _id: tempId,
        tempId,
        conversationId,
        senderId: currentUserId,
        senderName,
        senderImage,
        content: content.trim(),
        type: "text",
        readBy: [{ userId: currentUserId, readAt: new Date() }],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "sending",
      };

      setMessages((prev) => [...prev, optimistic]);
      socket.emit("dm:send", { conversationId, content: content.trim(), tempId });
    },
    [conversationId, currentUserId]
  );

  // ── Typing helpers ────────────────────────────────────────────
  const startTyping = useCallback(() => {
    if (!conversationId) return;
    socketClient.getSocket()?.emit("dm:typing:start", { conversationId });
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;
    socketClient.getSocket()?.emit("dm:typing:stop", { conversationId });
  }, [conversationId]);

  return { messages, isLoading, hasMore, loadMore, sendMessage, typingUsers, startTyping, stopTyping };
}