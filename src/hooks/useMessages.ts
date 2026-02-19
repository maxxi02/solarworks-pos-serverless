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

// Add this helper inside the hook, above the effects
const dedup = (msgs: DisplayMessage[]): DisplayMessage[] => {
  const seen = new Set<string>();
  return msgs.filter((m) => {
    const id = m._id as string;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export function useMessages(
  conversationId: string | null,
  currentUserId: string,
) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ── Fetch initial messages ────────────────────────────────────
  const fetchMessages = useCallback(async (convId: string) => {
    setIsLoading(true);
    // Don't clear messages immediately - we'll merge with existing optimistic ones
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = (await res.json()) as {
        messages: Message[];
        hasMore: boolean;
        nextCursor?: string;
      };

      // Merge fetched messages with pending optimistic messages
      setMessages((prev) => {
        // Keep only messages that are still sending (not yet confirmed by server)
        const stillPending = prev.filter(
          (m) => "tempId" in m && m.status === "sending",
        );

        // Create a set of real message IDs from the server response
        const realIds = new Set(data.messages.map((m) => m._id as string));

        // Filter out pending messages that have now been confirmed (exist in realIds)
        const notYetSaved = stillPending.filter(
          (m) => !realIds.has(m._id as string),
        );

        // Combine server messages with still-pending optimistic messages and dedup
        return dedup([...data.messages, ...notYetSaved]);
      });

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
      const res = await fetch(
        `/api/conversations/${conversationId}/messages?cursor=${nextCursor}`,
      );
      if (!res.ok) throw new Error("Failed to fetch older messages");
      const data = (await res.json()) as {
        messages: Message[];
        hasMore: boolean;
        nextCursor?: string;
      };
      setMessages((prev) => {
        // Combine older messages (first) with current messages, then dedup
        const combined = [...data.messages, ...prev];
        return dedup(combined);
      });
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
        // Skip own messages — already added optimistically
        if (payload.message.senderId === currentUserId) return prev;

        // Add new message and dedup to be safe
        return dedup([...prev, payload.message]);
      });

      if (payload.message.senderId !== currentUserId) {
        socket.emit("dm:read", { conversationId });
      }
    };

    const handleSent = (data: { tempId: string; messageId: string }) => {
      setMessages((prev) => {
        // Check if the confirmed message already exists in the list
        const alreadyExists = prev.some(
          (m) => !("tempId" in m) && m._id === data.messageId,
        );

        if (alreadyExists) {
          // If it exists, just remove the optimistic version
          return prev.filter(
            (m) => !("tempId" in m && m.tempId === data.tempId),
          );
        }

        // Otherwise, update the optimistic message with the real ID
        return prev.map((m) =>
          "tempId" in m && m.tempId === data.tempId
            ? ({
                ...m,
                _id: data.messageId,
                status: "sent",
              } as OptimisticMessage)
            : m,
        );
      });
    };

    const handleRead = (payload: DmReadPayload) => {
      if (payload.conversationId !== conversationId) return;
      const readSet = new Set(payload.messageIds);
      setMessages((prev) =>
        prev.map((m) => {
          if (!readSet.has(m._id as string)) return m;
          const alreadyRead = (m.readBy || []).some(
            (r) => r.userId === payload.userId,
          );
          if (alreadyRead) return m;
          return {
            ...m,
            readBy: [
              ...(m.readBy || []),
              { userId: payload.userId, readAt: new Date(payload.readAt) },
            ],
          };
        }),
      );
    };

    const handleTypingStart = (payload: DmTypingPayload) => {
      if (payload.conversationId !== conversationId) return;
      if (payload.userId === currentUserId) return;
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === payload.userId)) return prev;
        return [
          ...prev,
          { userId: payload.userId, userName: payload.userName },
        ];
      });
      const key = payload.userId;
      if (typingTimers.current.has(key))
        clearTimeout(typingTimers.current.get(key)!);
      typingTimers.current.set(
        key,
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== key));
          typingTimers.current.delete(key);
        }, 4000),
      );
    };

    const handleTypingStop = (payload: DmTypingPayload) => {
      if (payload.conversationId !== conversationId) return;
      const key = payload.userId;
      if (typingTimers.current.has(key))
        clearTimeout(typingTimers.current.get(key)!);
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
      if (!socket?.connected) return;

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

      setMessages((prev) => {
        // Add optimistic message and dedup to be safe
        const newMessages = [...prev, optimistic];
        return dedup(newMessages);
      });

      // Emit the message
      socket.emit("dm:send", {
        conversationId,
        content: content.trim(),
        tempId,
      });
    },
    [conversationId, currentUserId],
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

  return {
    messages,
    isLoading,
    hasMore,
    loadMore,
    sendMessage,
    typingUsers,
    startTyping,
    stopTyping,
  };
}
