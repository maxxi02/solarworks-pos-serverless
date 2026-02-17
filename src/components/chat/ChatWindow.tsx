"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Hash, Send, ChevronsUp, Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import type {
    SerializedConversation,
    SerializedMessage,
    TypingUser,
    UseChatReturn,
} from "@/types/chat.type";

interface ChatWindowProps {
    conversation: SerializedConversation;
    messages: SerializedMessage[];
    typingUsers: TypingUser[];
    hasMore: boolean;
    isLoadingMessages: boolean;
    currentUserId: string;
    getDisplayName: UseChatReturn["getDisplayName"];
    getOtherUserAvatar: UseChatReturn["getOtherUserAvatar"];
    onSendMessage: (content: string) => void;
    onLoadMore: () => void;
    onUpdateTyping: (isTyping: boolean) => void;
    onBack: () => void; // mobile — go back to list
}

const formatDateSeparator = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
};

const isSameDay = (a: string, b: string): boolean =>
    new Date(a).toDateString() === new Date(b).toDateString();

const isSameSenderGroup = (
    curr: SerializedMessage,
    prev: SerializedMessage | undefined
): boolean => {
    if (!prev) return false;
    return (
        curr.senderId === prev.senderId &&
        isSameDay(curr.createdAt, prev.createdAt) &&
        new Date(curr.createdAt).getTime() -
        new Date(prev.createdAt).getTime() <
        5 * 60 * 1000 // within 5 minutes = same group
    );
};

export function ChatWindow({
    conversation,
    messages,
    typingUsers,
    hasMore,
    isLoadingMessages,
    currentUserId,
    getDisplayName,
    getOtherUserAvatar,
    onSendMessage,
    onLoadMore,
    onUpdateTyping,
    onBack,
}: ChatWindowProps) {
    const [inputValue, setInputValue] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isGroup = conversation.type === "group";
    const displayName = getDisplayName(conversation);
    const avatarUrl = isGroup ? "" : getOtherUserAvatar(conversation);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const handleSend = useCallback(() => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        onSendMessage(trimmed);
        setInputValue("");
        // Reset textarea height
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    }, [inputValue, onSendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        onUpdateTyping(e.target.value.length > 0);

        // Auto-resize textarea
        const el = e.target;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    };

    // Clean up typing indicator on unmount
    useEffect(() => {
        return () => {
            if (inputValue.length > 0) {
                onUpdateTyping(false);
            }
        };
    }, [inputValue.length, onUpdateTyping]);

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
                {/* Mobile back button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:hidden"
                    onClick={onBack}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>

                {/* Avatar */}
                {isGroup ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <Hash className="h-4 w-4 text-primary" />
                    </div>
                ) : avatarUrl ? (
                    <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                        <span className="text-sm font-semibold">
                            {displayName.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}

                {/* Name & subtitle */}
                <div className="min-w-0">
                    <h3 className="truncate font-semibold leading-tight">{displayName}</h3>
                    <p className="text-xs text-muted-foreground">
                        {isGroup
                            ? `${conversation.participants.length} members`
                            : "Direct message"}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-0.5 p-4">
                    {/* Load more */}
                    {hasMore && (
                        <div className="mb-4 flex justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onLoadMore}
                                disabled={isLoadingMessages}
                                className="text-xs"
                            >
                                {isLoadingMessages ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                    <ChevronsUp className="mr-1 h-3 w-3" />
                                )}
                                Load earlier messages
                            </Button>
                        </div>
                    )}

                    {isLoadingMessages && messages.length === 0 && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {messages.length === 0 && !isLoadingMessages && (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No messages yet. Say hello! 👋
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const prev = messages[idx - 1];
                        const showDateSep =
                            !prev || !isSameDay(msg.createdAt, prev.createdAt);
                        const isOwn = msg.senderId === currentUserId;
                        const isGroupedWithPrev = isSameSenderGroup(msg, prev);

                        return (
                            <div key={msg._id}>
                                {showDateSep && (
                                    <div className="my-4 flex items-center gap-3">
                                        <div className="flex-1 border-t" />
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                            {formatDateSeparator(msg.createdAt)}
                                        </span>
                                        <div className="flex-1 border-t" />
                                    </div>
                                )}
                                <div className={isGroupedWithPrev ? "mt-0.5" : "mt-3"}>
                                    <MessageBubble
                                        message={msg}
                                        isOwn={isOwn}
                                        showSenderInfo={isGroup && !isOwn}
                                        isFirstInGroup={!isGroupedWithPrev}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing indicator inside messages */}
                    {typingUsers.length > 0 && (
                        <div className="mt-2">
                            <TypingIndicator typingUsers={typingUsers} />
                        </div>
                    )}

                    {/* Scroll anchor */}
                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t bg-background p-3">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        placeholder={`Message ${isGroup ? "# " : ""}${displayName}...`}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                        style={{ maxHeight: "120px", overflow: "auto" }}
                    />
                    <Button
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                    Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}