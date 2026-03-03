"use client";

import { format, isToday, isYesterday } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, OptimisticMessage } from "@/types/messaging.types"

type DisplayMessage = Message | OptimisticMessage;

interface MessageBubbleProps {
    message: DisplayMessage;
    isOwn: boolean;
    showAvatar: boolean;  // show avatar if first message in a group
    showTimestamp: boolean; // show timestamp if last message in a group or time gap
    otherParticipantName: string;
    otherParticipantImage?: string;
}

export function MessageBubble({
    message,
    isOwn,
    showAvatar,
    showTimestamp,
    otherParticipantName,
    otherParticipantImage,
}: MessageBubbleProps) {
    const isOptimistic = "status" in message;
    const status = isOptimistic ? message.status : "sent";

    // Determine read status for own messages
    const readByOthers =
        isOwn &&
        (message.readBy || []).some((r) => r.userId !== message.senderId);

    return (
        <div
            className={cn(
                "flex items-end gap-2",
                isOwn ? "flex-row-reverse" : "flex-row"
            )}
        >
            {/* Avatar */}
            <div className="flex-shrink-0 w-7">
                {!isOwn && showAvatar ? (
                    <Avatar className="h-7 w-7">
                        <AvatarImage src={otherParticipantImage} />
                        <AvatarFallback className="text-xs">
                            {otherParticipantName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                ) : null}
            </div>

            {/* Bubble + metadata */}
            <div
                className={cn(
                    "flex flex-col gap-0.5 max-w-[65%]",
                    isOwn ? "items-end" : "items-start"
                )}
            >
                <div
                    className={cn(
                        "px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] break-words overflow-hidden",
                        isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm",
                        status === "sending" && "opacity-60"
                    )}
                >
                    {message.content}
                </div>

                {/* Timestamp + status */}
                {showTimestamp && (
                    <div
                        className={cn(
                            "flex items-center gap-1 px-1",
                            isOwn ? "flex-row-reverse" : "flex-row"
                        )}
                    >
                        <span className="text-[11px] text-muted-foreground">
                            {formatMessageTime(new Date(message.createdAt))}
                        </span>

                        {/* Delivery status for own messages */}
                        {isOwn && (
                            <span className="text-muted-foreground">
                                {status === "sending" ? (
                                    <Clock className="h-3 w-3" />
                                ) : readByOthers ? (
                                    <CheckCheck className="h-3 w-3 text-primary" />
                                ) : (
                                    <Check className="h-3 w-3" />
                                )}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Date separator between messages ─────────────────────────────

export function DateSeparator({ date }: { date: Date }) {
    let label: string;
    if (isToday(date)) {
        label = "Today";
    } else if (isYesterday(date)) {
        label = "Yesterday";
    } else {
        label = format(date, "MMMM d, yyyy");
    }

    return (
        <div className="flex items-center gap-3 my-3 px-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
                {label}
            </span>
            <div className="flex-1 h-px bg-border" />
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatMessageTime(date: Date): string {
    return format(date, "h:mm a");
}

// Determine if two messages are in the same "group" (same sender, within 2 minutes)
export function isSameGroup(a: DisplayMessage, b: DisplayMessage): boolean {
    if (a.senderId !== b.senderId) return false;
    const diff =
        Math.abs(
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ) / 1000;
    return diff < 120; // 2 minutes
}

// Determine if a date separator should appear between two messages
export function needsDateSeparator(a: DisplayMessage, b: DisplayMessage): boolean {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return (
        dateA.getFullYear() !== dateB.getFullYear() ||
        dateA.getMonth() !== dateB.getMonth() ||
        dateA.getDate() !== dateB.getDate()
    );
}