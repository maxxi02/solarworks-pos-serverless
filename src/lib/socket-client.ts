// lib/socket.ts
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://rendezvous-server-gpmv.onrender.com";

// ─── Types ───────────────────────────────────────────────────────

export interface UserStatusUpdate {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface UserActivityUpdate {
  userId: string;
  lastSeen: Date;
}

// ─── Socket Client Class ─────────────────────────────────────────

class SocketClient {
  private socket: Socket | null = null;
  private userId: string | null = null;

  /**
   * Connect to Socket.IO server with user authentication
   */
  connect(userId: string): Socket {
    if (this.socket?.connected && this.userId === userId) {
      console.log("ℹ️  Using existing socket connection");
      return this.socket;
    }

    if (this.socket) {
      this.disconnect();
    }

    this.userId = userId;

    this.socket = io(SOCKET_URL, {
      auth: { userId },
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

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
      this.userId = null;
      console.log("🔌 Socket disconnected");
    }
  }

  /**
   * Emit user:online event
   */
  emitOnline(): void {
    if (!this.socket?.connected) {
      console.warn("⚠️  Socket not connected");
      return;
    }
    this.socket.emit("user:online");
  }

  /**
   * Emit user:activity event
   */
  emitActivity(): void {
    if (!this.socket?.connected) {
      console.warn("⚠️  Socket not connected");
      return;
    }
    this.socket.emit("user:activity");
  }

  /**
   * Listen for user status changes
   */
  onStatusChanged(callback: (data: UserStatusUpdate) => void): void {
    this.socket?.on("user:status:changed", callback);
  }

  /**
   * Listen for user activity updates
   */
  onActivityUpdated(callback: (data: UserActivityUpdate) => void): void {
    this.socket?.on("user:activity:updated", callback);
  }

  /**
   * Remove status changed listener
   */
  offStatusChanged(callback?: (data: UserStatusUpdate) => void): void {
    this.socket?.off("user:status:changed", callback);
  }

  /**
   * Remove activity updated listener
   */
  offActivityUpdated(callback?: (data: UserActivityUpdate) => void): void {
    this.socket?.off("user:activity:updated", callback);
  }

  /**
   * Get the current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Register global event listeners
   */
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
    });

    this.socket.on("reconnect_attempt", (attemptNumber: number) => {
      console.log("🔄 Reconnection attempt", attemptNumber);
    });

    this.socket.on("reconnect_error", (error: Error) => {
      console.error("❌ Reconnection error:", error.message);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed after all attempts");
    });

    this.socket.on("error", (error: Error) => {
      console.error("❌ Socket error:", error);
    });
  }
}

// ─── Export Singleton ────────────────────────────────────────────

export const socketClient = new SocketClient();
