"use client";

import type { TypingUser } from "@/types/chat.type";

interface TypingIndicatorProps {
    typingUsers: TypingUser[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
    if (typingUsers.length === 0) return null;

    const label =
        typingUsers.length === 1
            ? `${typingUsers[0].userName} is typing`
            : typingUsers.length === 2
                ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing`
                : "Several people are typing";

    return (
        <div className="flex items-center gap-2 px-4 py-1">
            {/* Animated dots */}
            <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                    />
                ))}
            </div>
            <span className="text-xs text-muted-foreground italic">{label}</span>
        </div>
    );
}