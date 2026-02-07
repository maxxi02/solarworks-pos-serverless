import { io } from "socket.io-client";

// Use environment variable for flexibility
const SOCKET_URL = "https://rendezvous-server-gpmv.onrender.com";

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"], // T
});

socket.on("connect", () => {
  console.log("✅ Connected to Socket.IO server:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 Disconnected:", reason);
});

socket.on("reconnect", (attemptNumber) => {
  console.log("🔄 Reconnected after", attemptNumber, "attempts");
});
