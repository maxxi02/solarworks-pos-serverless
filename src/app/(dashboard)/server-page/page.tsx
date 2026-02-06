"use client";
import ChatMessage from "@/components/chat-message";
import ChatForm from "@/components/forms/chat-form";
import { FormEvent, useEffect, useState } from "react";
import { socket } from "@/lib/socket-client";

const ServerPage = () => {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<
    { sender: string; message: string; isSystem?: boolean }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Socket listeners
  useEffect(() => {
    // Listen for user joined system message
    socket.on("user_joined", (data: string) => {
      setMessages((prev) => [
        ...prev,
        { sender: "system", message: data, isSystem: true },
      ]);
    });

    // Listen for chat messages from other users
    socket.on("message", (data: { sender: string; message: string }) => {
      setMessages((prev) => [
        ...prev,
        { sender: data.sender, message: data.message },
      ]);
    });

    // Optional: listen for errors from server
    socket.on("error", (msg: string) => {
      setError(msg);
    });

    // Cleanup on unmount
    return () => {
      socket.off("user_joined");
      socket.off("message");
      socket.off("error");
    };
  }, []);

  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault(); // ← Prevent page reload

    if (!username.trim() || !room.trim()) {
      setError("Please enter both username and room ID");
      return;
    }

    setError(null);
    socket.emit("join-room", { room, username });
    setJoined(true);
  };

  const handleSendMessage = (message: string) => {
    if (!message.trim() || !joined) return;

    // Send to server
    socket.emit("message", { room, message, sender: username });

    // Optimistically add your own message to the UI
    setMessages((prev) => [...prev, { sender: username, message }]);
  };

  return (
    <div className="flex mt-24 justify-center w-full px-4">
      {!joined ? (
        <div className="flex flex-col items-center justify-center w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6">Join Chat Room</h2>

          {error && (
            <p className="text-red-600 bg-red-100 p-3 rounded mb-4 w-full text-center">
              {error}
            </p>
          )}

          <form
            onSubmit={handleJoinRoom}
            className="flex flex-col gap-4 items-center w-full"
          >
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Username"
            />
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Room ID (e.g. room-123)"
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Room ID"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Join Room
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-3xl flex flex-col h-[80vh]">
          <h1 className="text-2xl font-bold mb-4">
            Room: <span className="text-blue-600">{room}</span>
          </h1>

          <div className="flex-1 overflow-y-auto p-4 mb-4 bg-gray-100 dark:bg-gray-800 border rounded-lg shadow-inner">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-10">
                No messages yet. Say something!
              </p>
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
          </div>

          <ChatForm onSendMessage={handleSendMessage} />
        </div>
      )}
    </div>
  );
};

export default ServerPage;
