"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocket } from "../../provider/socket-provider"; 
import type {
  ConversationWithDetails,
  DmReceivePayload,
} from "@/types/messaging.types";

export function useConversations(currentUserId: string) {
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = (await res.json()) as {
        conversations: ConversationWithDetails[];
      };
      setConversations(data.conversations);
    } catch (err) {
      setError("Failed to load conversations");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: DmReceivePayload) => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id !== payload.conversationId) return conv;
          return {
            ...conv,
            lastMessage: {
              content: payload.message.content,
              senderId: payload.message.senderId,
              senderName: payload.message.senderName,
              sentAt: new Date(payload.message.createdAt),
            },
            updatedAt: new Date(payload.message.createdAt),
            unreadCount:
              payload.message.senderId !== currentUserId
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount,
          };
        });
        const idx = updated.findIndex((c) => c._id === payload.conversationId);
        if (idx > 0) {
          const [moved] = updated.splice(idx, 1);
          updated.unshift(moved);
        }
        return [...updated];
      });
    };

    const handleStatusChange = (data: {
      userId: string;
      isOnline: boolean;
      lastSeen: Date;
    }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.isGroup) {
            const members = conv.members?.map((m) =>
              m.userId === data.userId
                ? { ...m, isOnline: data.isOnline, lastSeen: data.lastSeen }
                : m,
            );
            return { ...conv, members };
          }
          if (conv.otherParticipant?.userId !== data.userId) return conv;
          return {
            ...conv,
            otherParticipant: {
              ...conv.otherParticipant!,
              isOnline: data.isOnline,
              lastSeen: data.lastSeen,
            },
          };
        }),
      );
    };

    const handleRead = (data: { conversationId: string; userId: string }) => {
      if (data.userId !== currentUserId) return;
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === data.conversationId ? { ...conv, unreadCount: 0 } : conv,
        ),
      );
    };

    const handleGroupCreated = () => {
      fetchConversations();
    };

    socket.on("dm:receive", handleNewMessage);
    socket.on("user:status:changed", handleStatusChange);
    socket.on("dm:read", handleRead);
    socket.on("group:created", handleGroupCreated);

    return () => {
      socket.off("dm:receive", handleNewMessage);
      socket.off("user:status:changed", handleStatusChange);
      socket.off("dm:read", handleRead);
      socket.off("group:created", handleGroupCreated);
    };
  }, [socket, currentUserId, fetchConversations]);

  const startConversation = useCallback(
    async (targetUserId: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId }),
        });
        if (!res.ok) throw new Error("Failed to start conversation");
        const data = (await res.json()) as { conversationId: string };
        await fetchConversations();
        return data.conversationId;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [fetchConversations],
  );

  const createGroup = useCallback(
    async (groupName: string, memberIds: string[]): Promise<string | null> => {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupName, memberIds }),
        });
        if (!res.ok) throw new Error("Failed to create group");
        const data = (await res.json()) as { conversationId: string };
        await fetchConversations();
        return data.conversationId;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [fetchConversations],
  );

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
    startConversation,
    createGroup,
  };
}
