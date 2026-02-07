"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ChatMessage from "@/components/chat-message";
import ChatForm from "@/components/forms/chat-form";
import { socket } from "@/lib/socket-client";

interface ChatMessageType {
  sender: string;
  message: string;
  isSystem?: boolean;
}

const ServerPage = () => {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ─── Socket Connection Status ───────────────────────────────────────
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setError(null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setError("Disconnected from chat server");
    };

    const onConnectError = (err: Error) => {
      setError(`Connection failed: ${err.message}`);
      setIsConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    // Set initial connection state
    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  // ─── Chat Event Listeners ───────────────────────────────────────────
  useEffect(() => {
    socket.on("user_joined", (username: string) => {
      setMessages((prev) => [
        ...prev,
        { sender: "System", message: `${username} joined the room`, isSystem: true },
      ]);
    });

    socket.on("message", (data: { sender: string; message: string }) => {
      setMessages((prev) => [...prev, { sender: data.sender, message: data.message }]);
    });

    socket.on("error", (msg: string) => {
      setError(msg);
    });

    // Optional: room-specific system messages
    socket.on("room_message", (msg: string) => {
      setMessages((prev) => [...prev, { sender: "System", message: msg, isSystem: true }]);
    });

    return () => {
      socket.off("user_joined");
      socket.off("message");
      socket.off("error");
      socket.off("room_message");
    };
  }, []);

  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      setError("Not connected to server. Trying to reconnect...");
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedRoom = room.trim();

    if (!trimmedUsername || !trimmedRoom) {
      setError("Please enter both username and room ID");
      return;
    }

    setError(null);
    socket.emit("join-room", { room: trimmedRoom, username: trimmedUsername });
    setJoined(true);
  };

  const handleSendMessage = (message: string) => {
    if (!message.trim() || !joined || !isConnected) return;

    const trimmedMessage = message.trim();

    // We can send sender from client or let server assign it
    socket.emit("message", {
      room,
      message: trimmedMessage,
      // sender: username,   // ← optional, depends on your backend
    });

    // Optimistic UI update
    setMessages((prev) => [...prev, { sender: username, message: trimmedMessage }]);
  };

  return (
    <div className="flex min-h-screen items-start justify-center pt-24 px-4">
      {/* Connection Status Badge */}
      <div className="fixed top-4 right-4 z-50">
        <div
          className={`px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-colors ${isConnected
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white animate-pulse"
            }`}
        >
          {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </div>
      </div>

      {!joined ? (
        <div className="w-full max-w-md flex flex-col items-center">
          <h2 className="text-3xl font-bold mb-8 text-center">Join Chat Room</h2>

          {error && (
            <div className="w-full p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleJoinRoom} className="w-full space-y-4">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              required
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              aria-label="Username"
            />

            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Room ID (e.g. room-123 or friends-chat)"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              aria-label="Room ID"
            />

            <button
              type="submit"
              disabled={!isConnected}
              className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${isConnected
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                : "bg-gray-400 cursor-not-allowed"
                }`}
            >
              {isConnected ? "Join Room" : "Connecting..."}
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-3xl flex flex-col h-[80vh] sm:h-[85vh]">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">
              Room: <span className="text-blue-600">{room}</span>
            </h1>
            <p className="text-sm text-gray-500">Logged in as: {username}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 mb-4 bg-gray-50 dark:bg-gray-900 border rounded-xl shadow-inner">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                No messages yet. Be the first to say hi!
              </div>
            ) : (
              messages.map((msg, index) => (
                <ChatMessage
                  key={index}
                  sender={msg.sender}
                  message={msg.message}
                  isOwnMessage={msg.sender === username}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatForm onSendMessage={handleSendMessage} />
        </div>
      )}
    </div>
  );
};

export default ServerPage;