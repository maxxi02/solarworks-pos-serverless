"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SerializedMessage } from "@/types/chat.type";

interface MessageBubbleProps {
    message: SerializedMessage;
    isOwn: boolean;
    showSenderInfo: boolean; // true in group chats for messages from others
    isFirstInGroup: boolean; // first message from same sender in sequence
}

const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export function MessageBubble({
    message,
    isOwn,
    showSenderInfo,
    isFirstInGroup,
}: MessageBubbleProps) {
    if (isOwn) {
        return (
            <div className="flex justify-end">
                <div className="max-w-[70%]">
                    <div className="rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
                        <p className="text-sm leading-relaxed break-words">{message.content}</p>
                    </div>
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">
                        {formatTime(message.createdAt)}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-end gap-2">
            {/* Avatar placeholder — keeps alignment consistent in group chats */}
            <div className="w-7 shrink-0">
                {showSenderInfo && isFirstInGroup && (
                    <Avatar className="h-7 w-7">
                        <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                        <AvatarFallback className="text-[10px]">
                            {message.senderName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                )}
            </div>

            <div className="max-w-[70%]">
                {showSenderInfo && isFirstInGroup && (
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                        {message.senderName}
                    </p>
                )}
                <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
                    <p className="text-sm leading-relaxed wrap-break-word">{message.content}</p>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatTime(message.createdAt)}
                </p>
            </div>
        </div>
    );
}