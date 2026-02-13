// lib/socket-server.ts
/**
 * Server-side helpers to emit events from Next.js API routes to the Socket.IO server
 */

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://rendezvous-server-gpmv.onrender.com";

export const getServerSocketClient = (): Socket => {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      auth: { userId: "system-api" },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("✅ [server-socket] Connected to main Socket.IO server");
    });

    socket.on("connect_error", (err) => {
      console.error("❌ [server-socket] Connection error:", err);
    });

    socket.on("disconnect", () => {
      console.log("❌ [server-socket] Disconnected");
    });
  }
  return socket;
};

// ──────────────────────────────────────────────
// Standardized event names (no weird :trigger suffix)
// ──────────────────────────────────────────────

export const emitAttendanceStatusChanged = (data: {
  userId: string;
  attendanceId: string;
  status: string;
}) => {
  const client = getServerSocketClient();
  client.emit("attendance:status:changed", data);
  console.log("[emit] attendance:status:changed →", data);
};

export const emitAttendanceApproved = (data: {
  userId: string;
  attendanceId: string;
  status: string;
  totalHours?: number;
  approvedBy: string;
}) => {
  const client = getServerSocketClient();
  client.emit("attendance:approved", data);
  console.log("[emit] attendance:approved →", data);
};

export const emitAttendanceRejected = (data: {
  userId: string;
  attendanceId: string;
  rejectionReason: string;
  rejectedBy: string;
}) => {
  const client = getServerSocketClient();
  client.emit("attendance:rejected", data);
  console.log("[emit] attendance:rejected →", data);
};

export const disconnectServerSocketClient = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
