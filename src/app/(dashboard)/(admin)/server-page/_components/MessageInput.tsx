"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
    onSend: (content: string) => void;
    onTypingStart: () => void;
    onTypingStop: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export function MessageInput({
    onSend,
    onTypingStart,
    onTypingStop,
    disabled,
    placeholder = "Type a message...",
}: MessageInputProps) {
    const [content, setContent] = useState("");
    const isTypingRef = useRef(false);
    const typingStopTimer = useRef<NodeJS.Timeout>(null);

    const handleTyping = useCallback(
        (value: string) => {
            setContent(value);

            if (value.trim()) {
                if (!isTypingRef.current) {
                    isTypingRef.current = true;
                    onTypingStart();
                }

                // Reset the stop timer on every keystroke
                clearTimeout(typingStopTimer.current!);
                typingStopTimer.current = setTimeout(() => {
                    isTypingRef.current = false;
                    onTypingStop();
                }, 1500);
            } else {
                // Empty input - stop typing immediately
                if (isTypingRef.current) {
                    isTypingRef.current = false;
                    clearTimeout(typingStopTimer.current!);
                    onTypingStop();
                }
            }
        },
        [onTypingStart, onTypingStop]
    );

    const handleSend = useCallback(() => {
        const trimmed = content.trim();
        if (!trimmed || disabled) return;

        onSend(trimmed);
        setContent("");

        // Stop typing on send
        if (isTypingRef.current) {
            isTypingRef.current = false;
            clearTimeout(typingStopTimer.current!);
            onTypingStop();
        }
    }, [content, disabled, onSend, onTypingStop]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const canSend = content.trim().length > 0 && !disabled;

    return (
        <div className="flex items-end gap-2 p-3 border-t border-border bg-background">
            <Textarea
                value={content}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className={cn(
                    "flex-1 min-h-[40px] max-h-32 resize-none py-2.5 text-sm",
                    "scrollbar-thin overflow-y-auto"
                )}
                style={{
                    height: "auto",
                    overflowY: content.split("\n").length > 3 ? "auto" : "hidden",
                }}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 128) + "px";
                }}
            />

            <Button
                size="icon"
                className="h-10 w-10 flex-shrink-0"
                onClick={handleSend}
                disabled={!canSend}
                aria-label="Send message"
            >
                <Send className="h-4 w-4" />
            </Button>
        </div>
    );
}