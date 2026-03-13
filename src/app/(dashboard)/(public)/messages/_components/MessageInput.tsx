"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, ImageIcon, X, FileIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MessageAttachment } from "@/types/messaging.types";

interface PendingAttachment {
    file: File;
    preview?: string; // for images
    uploading: boolean;
    uploaded?: MessageAttachment;
    error?: string;
}

interface MessageInputProps {
    onSend: (content: string, attachments?: MessageAttachment[]) => void;
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
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
    const isTypingRef = useRef(false);
    const typingStopTimer = useRef<NodeJS.Timeout>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleTyping = useCallback(
        (value: string) => {
            setContent(value);
            if (value.trim()) {
                if (!isTypingRef.current) {
                    isTypingRef.current = true;
                    onTypingStart();
                }
                clearTimeout(typingStopTimer.current!);
                typingStopTimer.current = setTimeout(() => {
                    isTypingRef.current = false;
                    onTypingStop();
                }, 1500);
            } else {
                if (isTypingRef.current) {
                    isTypingRef.current = false;
                    clearTimeout(typingStopTimer.current!);
                    onTypingStop();
                }
            }
        },
        [onTypingStart, onTypingStop]
    );

    const uploadFile = useCallback(async (file: File, idx: number) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/messages/upload", { method: "POST", body: formData });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Upload failed" }));
                throw new Error(errorData.error || "Upload failed");
            }
            const data = (await res.json()) as MessageAttachment;

            setPendingAttachments((prev) =>
                prev.map((a, i) =>
                    i === idx ? { ...a, uploading: false, uploaded: data } : a
                )
            );
            toast.success(`${file.name} uploaded successfully`);
        } catch (error) {
            console.error("Upload error:", error);
            const errorMessage = error instanceof Error ? error.message : "Upload failed";
            setPendingAttachments((prev) =>
                prev.map((a, i) =>
                    i === idx ? { ...a, uploading: false, error: errorMessage } : a
                )
            );
            toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
        }
    }, []);

    const handleFiles = useCallback(
        (files: FileList | null) => {
            if (!files) return;
            const newItems: PendingAttachment[] = Array.from(files).map((file) => ({
                file,
                preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
                uploading: true,
            }));

            setPendingAttachments((prev) => {
                const startIdx = prev.length;
                newItems.forEach((_, i) => uploadFile(files[i], startIdx + i));
                return [...prev, ...newItems];
            });
        },
        [uploadFile]
    );

    const removeAttachment = useCallback((idx: number) => {
        setPendingAttachments((prev) => {
            const a = prev[idx];
            if (a.preview) URL.revokeObjectURL(a.preview);
            return prev.filter((_, i) => i !== idx);
        });
    }, []);

    const handleSend = useCallback(() => {
        const trimmed = content.trim();
        const hasAttachments = pendingAttachments.some((a) => a.uploaded);
        if ((!trimmed && !hasAttachments) || disabled) return;

        // Block if any still uploading
        if (pendingAttachments.some((a) => a.uploading)) {
            toast.info("Please wait for uploads to finish");
            return;
        }

        const attachments = pendingAttachments
            .filter((a) => a.uploaded)
            .map((a) => a.uploaded!);

        onSend(trimmed || " ", attachments.length > 0 ? attachments : undefined);
        setContent("");
        setPendingAttachments([]);

        if (isTypingRef.current) {
            isTypingRef.current = false;
            clearTimeout(typingStopTimer.current!);
            onTypingStop();
        }

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }, [content, disabled, onSend, onTypingStop, pendingAttachments]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const canSend =
        !disabled &&
        !pendingAttachments.some((a) => a.uploading) &&
        (content.trim().length > 0 || pendingAttachments.some((a) => a.uploaded));

    return (
        <div className="flex flex-col gap-2">
            {/* Attachment Previews */}
            {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                    {pendingAttachments.map((a, idx) => (
                        <div key={idx} className="relative group">
                            {a.preview ? (
                                <div className={cn("h-16 w-16 rounded-lg overflow-hidden border border-border", a.uploading && "opacity-60")}>
                                    <img src={a.preview} alt={a.file.name} className="h-full w-full object-cover" />
                                    {a.uploading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={cn("h-16 px-3 rounded-lg border border-border bg-muted flex items-center gap-2 min-w-[120px]", a.uploading && "opacity-60")}>
                                    {a.uploading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium truncate max-w-[80px]">{a.file.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{formatFileSize(a.file.size)}</p>
                                    </div>
                                </div>
                            )}
                            {a.error && (
                                <div className="absolute inset-0 flex items-center justify-center bg-destructive/20 rounded-lg">
                                    <span className="text-[10px] text-destructive font-medium px-1">Failed</span>
                                </div>
                            )}
                            <button
                                onClick={() => removeAttachment(idx)}
                                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-white hidden group-hover:flex items-center justify-center shadow"
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Row */}
            <div className="flex items-end gap-2">
                {/* Image attach */
                <Button
                    variant="ghost" size="icon"
                    className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
                    disabled={disabled}
                    onClick={() => imageInputRef.current?.click()}
                    title="Attach image"
                >
                    <ImageIcon className="h-4 w-4" />
                </Button>

                {/* File attach */}
                <Button
                    variant="ghost" size="icon"
                    className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
                    disabled={disabled}
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                >
                    <Paperclip className="h-4 w-4" />
                </Button>

                {/* Hidden file inputs */}
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />

                <Textarea
                    ref={textareaRef}
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
        </div>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}