"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";

interface ChatMessage {
    _id: string;
    sessionId: string;
    senderId: string;
    senderName: string;
    senderRole: "customer" | "staff";
    message: string;
    createdAt: string;
}

interface ChatDrawerProps {
    sessionId?: string;
    tableId?: string;
    staffName: string;
    staffId: string;
    onClose: () => void;
}

export function ChatDrawer({ sessionId, tableId, staffName, staffId, onClose }: ChatDrawerProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<any>(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Connect and listen
    useEffect(() => {
        // Dynamic import to avoid SSR issues
        import("socket.io-client").then(({ io }) => {
            const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "https://rendezvous-server-gpmv.onrender.com";
            const socket = io(socketUrl, {
                auth: { userId: staffId, userName: staffName },
            });

            socketRef.current = socket;

            const joinEvent = tableId ? "chat:table:join" : "chat:join";
            const historyEvent = tableId ? "chat:table:history" : "chat:history";
            const historyResultEvent = tableId ? "chat:table:history:result" : "chat:history:result";
            const receiveEvent = tableId ? "chat:table:receive" : "chat:receive";
            const leaveEvent = tableId ? "chat:table:leave" : "chat:leave";

            const joinData = tableId ? { tableId } : { sessionId };

            // Join the chat room
            socket.emit(joinEvent, joinData);

            // Fetch history
            socket.emit(historyEvent, joinData);
            socket.on(historyResultEvent, (data: any) => {
                const idMatch = tableId ? data.tableId === tableId : data.sessionId === sessionId;
                if (idMatch) {
                    setMessages(data.messages);
                    setIsLoading(false);
                }
            });

            // Listen for new messages
            socket.on(receiveEvent, (data: any) => {
                const idMatch = tableId ? data.tableId === tableId : data.sessionId === sessionId;
                if (idMatch) {
                    setMessages((prev) => [...prev, data.message]);
                }
            });

            return () => {
                socket.emit(leaveEvent, joinData);
                socket.disconnect();
            };
        });
    }, [sessionId, tableId, staffId, staffName]);

    const handleSend = () => {
        if (!input.trim() || !socketRef.current) return;

        const sendEvent = tableId ? "chat:table:send" : "chat:send";

        socketRef.current.emit(sendEvent, {
            tableId: tableId || undefined,
            sessionId: tableId ? undefined : sessionId,
            message: input.trim(),
            senderName: staffName,
            senderRole: "staff",
        });

        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                    <h3 className="font-bold text-foreground text-sm">{tableId ? "Table Chat" : "Customer Chat"}</h3>
                    <p className="text-xs text-muted-foreground">{tableId ? "Table" : "Session"}: {(sessionId || tableId || "").slice(0, 8)}...</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                                <div className="h-10 w-48 rounded-xl bg-muted animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-xs">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg._id}
                            className={`flex ${msg.senderRole === "staff" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${msg.senderRole === "staff"
                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                    : "bg-muted text-foreground rounded-bl-sm"
                                    }`}
                            >
                                <p className="text-xs font-medium opacity-70 mb-0.5">
                                    {msg.senderName}
                                </p>
                                <p className="text-sm">{msg.message}</p>
                                <p className="text-[10px] opacity-50 mt-1">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
