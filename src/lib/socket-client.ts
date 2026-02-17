import { io, Socket } from "socket.io-client";
import type {
  ConversationsLoadedPayload,
  MessagesLoadedPayload,
  MessageNewPayload,
  ConversationNewPayload,
  DirectReadyPayload,
  TypingPayload,
  ChatErrorPayload,
} from "@/types/chat.type";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://rendezvous-server-gpmv.onrender.com";

// ─── Existing types (unchanged) ───────────────────────────────────

export interface UserStatusUpdate {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface UserActivityUpdate {
  userId: string;
  lastSeen: Date;
}

export interface AttendanceApprovedData {
  attendanceId: string;
  userId: string;
  status: string;
  totalHours?: number;
  approvedBy: string;
}

export interface AttendanceRejectedData {
  attendanceId: string;
  userId: string;
  status: string;
  rejectionReason: string;
  rejectedBy: string;
}

export interface AttendanceStatusChangedData {
  attendanceId: string;
  userId: string;
  status: string;
}

// ─── Socket Client Class ─────────────────────────────────────────

class SocketClient {
  private socket: Socket | null = null;
  private userId: string | null = null;

  /**
   * Connect with full user context so the server can attach name/avatar
   * to chat messages without a DB lookup on every send.
   */
  connect(userId: string, userName?: string, userAvatar?: string): Socket {
    if (this.socket?.connected && this.userId === userId) {
      console.log("ℹ️  Using existing socket connection");
      return this.socket;
    }

    if (this.socket) {
      this.disconnect();
    }

    this.userId = userId;

    this.socket = io(SOCKET_URL, {
      auth: {
        userId,
        userName: userName ?? "",
        userAvatar: userAvatar ?? "",
      },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ["websocket", "polling"],
    });

    this.registerEventListeners();
    this.socket.connect();

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
      this.userId = null;
      console.log("🔌 Socket disconnected");
    }
  }

  // ─── Existing presence emitters ──────────────────────────────────

  emitOnline(): void {
    if (!this.socket?.connected) return;
    this.socket.emit("user:online");
  }

  emitActivity(): void {
    if (!this.socket?.connected) return;
    this.socket.emit("user:activity");
  }

  // ─── Chat emitters ────────────────────────────────────────────────

  emitChatConversationsLoad(): void {
    this.socket?.emit("chat:conversations:load");
  }

  emitChatMessagesLoad(conversationId: string, cursor?: string): void {
    this.socket?.emit("chat:messages:load", { conversationId, cursor });
  }

  emitChatMessageSend(conversationId: string, content: string): void {
    this.socket?.emit("chat:message:send", { conversationId, content });
  }

  emitChatDirectGetOrCreate(
    targetUserId: string,
    targetUserName: string,
    targetUserAvatar?: string,
  ): void {
    this.socket?.emit("chat:direct:get-or-create", {
      targetUserId,
      targetUserName,
      targetUserAvatar: targetUserAvatar ?? "",
    });
  }

  emitChatTypingUpdate(conversationId: string, isTyping: boolean): void {
    this.socket?.emit("chat:typing:update", { conversationId, isTyping });
  }

  emitChatMessagesRead(conversationId: string): void {
    this.socket?.emit("chat:messages:read", { conversationId });
  }

  // ─── Chat listeners ───────────────────────────────────────────────

  onChatConversationsLoaded(cb: (p: ConversationsLoadedPayload) => void): void {
    this.socket?.on("chat:conversations:loaded", cb);
  }
  offChatConversationsLoaded(
    cb?: (p: ConversationsLoadedPayload) => void,
  ): void {
    this.socket?.off("chat:conversations:loaded", cb);
  }

  onChatMessagesLoaded(cb: (p: MessagesLoadedPayload) => void): void {
    this.socket?.on("chat:messages:loaded", cb);
  }
  offChatMessagesLoaded(cb?: (p: MessagesLoadedPayload) => void): void {
    this.socket?.off("chat:messages:loaded", cb);
  }

  onChatMessageNew(cb: (p: MessageNewPayload) => void): void {
    this.socket?.on("chat:message:new", cb);
  }
  offChatMessageNew(cb?: (p: MessageNewPayload) => void): void {
    this.socket?.off("chat:message:new", cb);
  }

  onChatConversationNew(cb: (p: ConversationNewPayload) => void): void {
    this.socket?.on("chat:conversation:new", cb);
  }
  offChatConversationNew(cb?: (p: ConversationNewPayload) => void): void {
    this.socket?.off("chat:conversation:new", cb);
  }

  onChatDirectReady(cb: (p: DirectReadyPayload) => void): void {
    this.socket?.on("chat:direct:ready", cb);
  }
  offChatDirectReady(cb?: (p: DirectReadyPayload) => void): void {
    this.socket?.off("chat:direct:ready", cb);
  }

  onChatTyping(cb: (p: TypingPayload) => void): void {
    this.socket?.on("chat:typing", cb);
  }
  offChatTyping(cb?: (p: TypingPayload) => void): void {
    this.socket?.off("chat:typing", cb);
  }

  onChatError(cb: (p: ChatErrorPayload) => void): void {
    this.socket?.on("chat:error", cb);
  }
  offChatError(cb?: (p: ChatErrorPayload) => void): void {
    this.socket?.off("chat:error", cb);
  }

  // ─── Existing status listeners (unchanged) ────────────────────────

  onStatusChanged(callback: (data: UserStatusUpdate) => void): void {
    this.socket?.on("user:status:changed", callback);
  }
  offStatusChanged(callback?: (data: UserStatusUpdate) => void): void {
    this.socket?.off("user:status:changed", callback);
  }

  onActivityUpdated(callback: (data: UserActivityUpdate) => void): void {
    this.socket?.on("user:activity:updated", callback);
  }
  offActivityUpdated(callback?: (data: UserActivityUpdate) => void): void {
    this.socket?.off("user:activity:updated", callback);
  }

  onAttendanceApproved(callback: (data: AttendanceApprovedData) => void): void {
    this.socket?.on("attendance:approved", callback);
  }
  offAttendanceApproved(
    callback?: (data: AttendanceApprovedData) => void,
  ): void {
    this.socket?.off("attendance:approved", callback);
  }

  onAttendanceRejected(callback: (data: AttendanceRejectedData) => void): void {
    this.socket?.on("attendance:rejected", callback);
  }
  offAttendanceRejected(
    callback?: (data: AttendanceRejectedData) => void,
  ): void {
    this.socket?.off("attendance:rejected", callback);
  }

  onAttendanceStatusChanged(
    callback: (data: AttendanceStatusChangedData) => void,
  ): void {
    this.socket?.on("attendance:status:changed", callback);
  }
  offAttendanceStatusChanged(
    callback?: (data: AttendanceStatusChangedData) => void,
  ): void {
    this.socket?.off("attendance:status:changed", callback);
  }

  // ─── Utilities ────────────────────────────────────────────────────

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private registerEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("✅ Connected to Socket.IO server:", this.socket?.id);
    });

    this.socket.on("connect_error", (error: Error) => {
      console.error("❌ Connection error:", error.message);
    });

    this.socket.on("disconnect", (reason: string) => {
      console.log("🔌 Disconnected:", reason);
      if (reason === "io server disconnect") {
        this.socket?.connect();
      }
    });

    this.socket.on("reconnect", (attemptNumber: number) => {
      console.log("🔄 Reconnected after", attemptNumber, "attempts");
      this.emitOnline();
      // Re-request conversations after reconnect — server rejoins rooms automatically
      this.emitChatConversationsLoad();
    });

    this.socket.on("reconnect_attempt", (n: number) => {
      console.log("🔄 Reconnection attempt", n);
    });

    this.socket.on("reconnect_error", (error: Error) => {
      console.error("❌ Reconnection error:", error.message);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed");
    });

    this.socket.on("error", (error: Error) => {
      console.error("❌ Socket error:", error);
    });
  }
}

export const socketClient = new SocketClient();
