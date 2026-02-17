"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Users, Info, ArrowDown, Loader2 } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { MessageBubble, DateSeparator, formatDateSeparator } from "../_components/MessageBubble";
import { ChatInput } from "./ChatInput";
import { Attachment, MessageWithId } from "@/types/chat.types";
import { socketClient } from "@/lib/socket-client";

interface ChatWindowProps {
    currentUserId: string;
    currentUserName: string;
    currentUserAvatar?: string;
    onLoadMore: (conversationId: string) => void;
}

function TypingIndicator({ names }: { names: string[] }) {
    if (names.length === 0) return null;
    const label =
        names.length === 1
            ? `${names[0]} is typing...`
            : names.length === 2
                ? `${names[0]} and ${names[1]} are typing...`
                : `${names.length} people are typing...`;

    return (
        <div className="flex items-center gap-2 px-4 pb-2">
            <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
            <span className="text-xs text-slate-500 italic">{label}</span>
        </div>
    );
}

function EmptyState({ name }: { name: string }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Users size={24} className="text-indigo-400" />
            </div>
            <div className="text-center">
                <h3 className="text-slate-300 font-semibold">{name}</h3>
                <p className="text-slate-500 text-sm mt-1">No messages yet. Start the conversation!</p>
            </div>
        </div>
    );
}

function NoChatSelected() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </div>
            <div className="text-center">
                <h3 className="text-slate-300 font-semibold text-lg">Select a conversation</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-xs">Choose a chat from the sidebar or start a new direct message</p>
            </div>
        </div>
    );
}

export function ChatWindow({
    currentUserId,
    currentUserName,
    currentUserAvatar,
    onLoadMore,
}: ChatWindowProps) {
    const {
        activeConversationId,
        getActiveConversation,
        messages,
        hasMore,
        isLoadingMessages,
        typingUsers,
        addMessage,
        upsertConversation,
    } = useChatStore();

    const [replyTo, setReplyTo] = useState<MessageWithId | null>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevScrollHeight = useRef(0);
    const isAtBottom = useRef(true);

    const conv = getActiveConversation();
    const convMessages = activeConversationId ? messages[activeConversationId] ?? [] : [];
    const convTyping = activeConversationId ? typingUsers[activeConversationId] ?? [] : [];

    const displayName =
        conv
            ? conv.type === "group"
                ? conv.name ?? "Group"
                : conv.participants.find((p) => p.userId !== currentUserId)?.userName ?? "DM"
            : "";

    const displayAvatar =
        conv?.type === "group"
            ? conv.avatar
            : conv?.participants.find((p) => p.userId !== currentUserId)?.userAvatar;

    // Scroll to bottom on new messages if already at bottom
    useEffect(() => {
        if (isAtBottom.current) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [convMessages.length]);

    // Restore scroll after loading older messages
    useEffect(() => {
        if (!isLoadingMessages && scrollRef.current) {
            const diff = scrollRef.current.scrollHeight - prevScrollHeight.current;
            if (diff > 0) scrollRef.current.scrollTop += diff;
        }
    }, [isLoadingMessages]);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        isAtBottom.current = atBottom;
        setShowScrollBtn(!atBottom);

        // Load more when near the top
        if (el.scrollTop < 100 && hasMore[activeConversationId!] && !isLoadingMessages) {
            prevScrollHeight.current = el.scrollHeight;
            onLoadMore(activeConversationId!);
        }
    }, [activeConversationId, hasMore, isLoadingMessages, onLoadMore]);

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = useCallback(
        async (content: string, attachments: Attachment[]) => {
            if (!activeConversationId) return;

            // Optimistic message
            const optimistic: MessageWithId = {
                _id: `optimistic-${Date.now()}`,
                conversationId: activeConversationId,
                senderId: currentUserId,
                senderName: currentUserName,
                senderAvatar: currentUserAvatar ?? "",
                content,
                attachments,
                reactions: [],
                replyTo: replyTo
                    ? { messageId: replyTo._id, content: replyTo.content, senderName: replyTo.senderName }
                    : undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            addMessage(activeConversationId, optimistic);
            setReplyTo(null);
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });

            // Build payload — the socket server should pick up content + attachments
            // You'll need to extend your socket server to accept attachments
            // For now, we send content and attachments via socket
            const socket = socketClient.getSocket();
            socket?.emit("chat:message:send", {
                conversationId: activeConversationId,
                content,
                attachments,
                replyTo: replyTo
                    ? { messageId: replyTo._id, content: replyTo.content, senderName: replyTo.senderName }
                    : undefined,
            });

            // Also update last message in sidebar
            if (conv) {
                upsertConversation({
                    ...conv,
                    lastMessage: {
                        content: content || (attachments.length > 0 ? "📎 Attachment" : ""),
                        senderName: currentUserName,
                        sentAt: new Date(),
                        hasAttachment: attachments.length > 0,
                    },
                    updatedAt: new Date(),
                });
            }
        },
        [activeConversationId, currentUserId, currentUserName, currentUserAvatar, replyTo, addMessage, conv, upsertConversation]
    );

    const handleTyping = useCallback(() => {
        if (activeConversationId) {
            socketClient.emitChatTypingUpdate(activeConversationId, true);
        }
    }, [activeConversationId]);

    // Group messages for avatar/name display
    const groupedMessages = convMessages.map((msg, i) => {
        const prev = convMessages[i - 1];
        const next = convMessages[i + 1];
        const isFirstInGroup = !prev || prev.senderId !== msg.senderId ||
            new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;
        const isLastInGroup = !next || next.senderId !== msg.senderId ||
            new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() > 5 * 60 * 1000;
        const showDateSep = !prev || formatDateSeparator(msg.createdAt) !== formatDateSeparator(prev.createdAt);
        return { msg, isFirstInGroup, isLastInGroup, showDateSep };
    });

    if (!activeConversationId || !conv) {
        return (
            <div className="flex-1 flex flex-col bg-slate-950/50">
                <NoChatSelected />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-950/50 min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-slate-900/60 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                    {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{
                                background: `hsl(${displayName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360},55%,40%)`,
                            }}
                        >
                            {displayName.slice(0, 2).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h3 className="text-white font-semibold text-sm">{displayName}</h3>
                        <p className="text-xs text-slate-500">
                            {conv.type === "group"
                                ? `${conv.participants.length} members`
                                : "Direct message"}
                        </p>
                    </div>
                </div>
                <button className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <Info size={18} />
                </button>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto py-4 space-y-0 scrollbar-thin scrollbar-thumb-white/10"
            >
                {/* Load more indicator */}
                {isLoadingMessages && (
                    <div className="flex justify-center py-4">
                        <Loader2 size={18} className="text-slate-500 animate-spin" />
                    </div>
                )}

                {convMessages.length === 0 && !isLoadingMessages && <EmptyState name={displayName} />}

                {groupedMessages.map(({ msg, isFirstInGroup, isLastInGroup, showDateSep }) => (
                    <div key={msg._id}>
                        {showDateSep && <DateSeparator date={msg.createdAt} />}
                        <MessageBubble
                            message={msg}
                            isOwn={msg.senderId === currentUserId}
                            showAvatar={isLastInGroup}
                            isFirstInGroup={isFirstInGroup}
                            isLastInGroup={isLastInGroup}
                            onReply={setReplyTo}
                        />
                    </div>
                ))}

                <TypingIndicator names={convTyping.map((t) => t.userName)} />
                <div ref={bottomRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollBtn && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-28 right-6 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white rounded-full p-2 shadow-xl transition-all"
                >
                    <ArrowDown size={16} />
                </button>
            )}

            {/* Input */}
            <ChatInput
                conversationId={activeConversationId}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
            />
        </div>
    );
}