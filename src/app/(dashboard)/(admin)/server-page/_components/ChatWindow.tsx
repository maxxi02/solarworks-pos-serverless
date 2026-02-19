"use client";

import { useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { MessageBubble, DateSeparator, isSameGroup, needsDateSeparator } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import type { ConversationWithDetails } from "@/types/messaging.types";
import type { Message, OptimisticMessage } from "@/types/messaging.types"

type DisplayMessage = Message | OptimisticMessage;

interface ChatWindowProps {
    conversation: ConversationWithDetails;
    currentUserId: string;
    currentUserName: string;
    currentUserImage?: string;
    onBack?: () => void; // for mobile back button
}

export function ChatWindow({
    conversation,
    currentUserId,
    currentUserName,
    currentUserImage,
    onBack,
}: ChatWindowProps) {
    const conversationId = conversation._id as string;
    const { otherParticipant } = conversation;

    const {
        messages,
        isLoading,
        hasMore,
        loadMore,
        sendMessage,
        typingUsers,
        startTyping,
        stopTyping,
    } = useMessages(conversationId, currentUserId);

    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevScrollHeight = useRef(0);

    // Scroll to bottom on new messages (but not on load-more)
    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages.length, isLoading]);

    // Preserve scroll position when loading older messages
    const handleLoadMore = useCallback(() => {
        if (!scrollRef.current) return;
        prevScrollHeight.current = scrollRef.current.scrollHeight;
        loadMore().then(() => {
            if (scrollRef.current) {
                const diff = scrollRef.current.scrollHeight - prevScrollHeight.current;
                scrollRef.current.scrollTop = diff;
            }
        });
    }, [loadMore]);

    // Detect scroll to top for infinite scroll upward
    const handleScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            if (e.currentTarget.scrollTop < 80 && hasMore && !isLoading) {
                handleLoadMore();
            }
        },
        [hasMore, isLoading, handleLoadMore]
    );

    const handleSend = useCallback(
        (content: string) => {
            sendMessage(content, currentUserName, currentUserImage);
        },
        [sendMessage, currentUserName, currentUserImage]
    );

    // Format last seen
    const getStatusText = () => {
        if (otherParticipant.isOnline) return "Online";
        if (!otherParticipant.lastSeen) return "Offline";
        const diff = Date.now() - new Date(otherParticipant.lastSeen).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Last seen just now";
        if (mins < 60) return `Last seen ${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `Last seen ${hrs}h ago`;
        return `Last seen ${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
                {onBack && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                )}

                <div className="relative flex-shrink-0">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={otherParticipant.image} />
                        <AvatarFallback className="text-sm font-medium">
                            {otherParticipant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {otherParticipant.isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{otherParticipant.name}</p>
                    <p className="text-xs text-muted-foreground">{getStatusText()}</p>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
                onScroll={handleScroll}
            >
                {/* Load more indicator */}
                {hasMore && (
                    <div className="flex justify-center py-2">
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                            <button
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                onClick={handleLoadMore}
                            >
                                Load older messages
                            </button>
                        )}
                    </div>
                )}

                {isLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Avatar className="h-14 w-14 mb-3">
                            <AvatarImage src={otherParticipant.image} />
                            <AvatarFallback className="text-xl">
                                {otherParticipant.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm">{otherParticipant.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Send a message to start the conversation
                        </p>
                    </div>
                ) : (
                    <MessageList
                        messages={messages}
                        currentUserId={currentUserId}
                        otherParticipantName={otherParticipant.name}
                        otherParticipantImage={otherParticipant.image}
                    />
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="flex items-end gap-2 mt-1">
                        <div className="w-7 flex-shrink-0" />
                        <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                            <TypingDots />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0">
                <MessageInput
                    onSend={handleSend}
                    onTypingStart={startTyping}
                    onTypingStop={stopTyping}
                />
            </div>
        </div>
    );
}

// ─── Message list with grouping + date separators ─────────────────

function MessageList({
    messages,
    currentUserId,
    otherParticipantName,
    otherParticipantImage,
}: {
    messages: DisplayMessage[];
    currentUserId: string;
    otherParticipantName: string;
    otherParticipantImage?: string;
}) {

    // Inside MessageList, before the map:
    console.log("🔍 currentUserId:", currentUserId);
    console.log("🔍 first message senderId:", messages[0]?.senderId);

    return (
        <>
            {messages.map((msg, i) => {
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const isOwn = msg.senderId === currentUserId;

                const showDate = !prev || needsDateSeparator(prev, msg);
                // const inSameGroupAsPrev = prev && isSameGroup(prev, msg);
                const inSameGroupAsNext = next && isSameGroup(msg, next);

                const showAvatar = !isOwn && !inSameGroupAsNext;
                const showTimestamp = !inSameGroupAsNext;

                return (
                    <div key={msg._id as string}>
                        {showDate && <DateSeparator date={new Date(msg.createdAt)} />}
                        <MessageBubble
                            message={msg}
                            isOwn={isOwn}
                            showAvatar={showAvatar}
                            showTimestamp={showTimestamp}
                            otherParticipantName={otherParticipantName}
                            otherParticipantImage={otherParticipantImage}
                        />
                    </div>
                );
            })}
        </>
    );
}

// ─── Animated typing dots ─────────────────────────────────────────

function TypingDots() {
    return (
        <div className="flex items-center gap-1 h-4">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
                />
            ))}
        </div>
    );
}