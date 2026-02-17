"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import {
    Paperclip, Send, Smile, X, File, Image, Mic, Film,
    AlertCircle,
} from "lucide-react";
import { Attachment, MessageWithId } from "@/types/chat.types";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

const ACCEPTED_FILES = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";

interface ChatInputProps {
    conversationId: string;
    replyTo: MessageWithId | null;
    onClearReply: () => void;
    onSendMessage: (content: string, attachments: Attachment[]) => void;
    onTyping: () => void;
}

interface PendingAttachment {
    file: File;
    previewUrl?: string;
    id: string;
}

function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return <Image size={14} className="text-emerald-400" />;
    if (mimeType.startsWith("video/")) return <Film size={14} className="text-purple-400" />;
    if (mimeType.startsWith("audio/")) return <Mic size={14} className="text-pink-400" />;
    return <File size={14} className="text-blue-400" />;
}

export function ChatInput({
    replyTo,
    onClearReply,
    onSendMessage,
    onTyping,
}: ChatInputProps) {
    const [content, setContent] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadFiles } = useFileUpload();

    const canSend = (content.trim() || pendingFiles.length > 0) && !isSending;

    const addFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files);
        const newPending: PendingAttachment[] = arr.map((f) => ({
            file: f,
            previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
            id: `${Date.now()}-${Math.random()}`,
        }));
        setPendingFiles((prev) => [...prev, ...newPending]);
        setError(null);
    }, []);

    const removeFile = useCallback((id: string) => {
        setPendingFiles((prev) => {
            const file = prev.find((f) => f.id === id);
            if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
            return prev.filter((f) => f.id !== id);
        });
    }, []);

    const handleSend = async () => {
        if (!canSend) return;
        setIsSending(true);
        setError(null);

        try {
            let attachments: Attachment[] = [];
            if (pendingFiles.length > 0) {
                attachments = await uploadFiles(pendingFiles.map((p) => p.file));
                if (attachments.length < pendingFiles.length) {
                    setError("Some files failed to upload. Message sent with successful uploads.");
                }
                // Revoke preview URLs
                pendingFiles.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
                setPendingFiles([]);
            }

            onSendMessage(content.trim(), attachments);
            setContent("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        } catch {
            setError("Failed to send message. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        onTyping();
        // Auto-resize
        const ta = e.target;
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    };

    const handleEmojiSelect = (emoji: { native: string }) => {
        setContent((prev) => prev + emoji.native);
        setShowEmoji(false);
        textareaRef.current?.focus();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    };

    return (
        <div
            className={cn(
                "relative border-t border-white/5 bg-slate-900/60 backdrop-blur-sm p-4",
                isDragging && "ring-2 ring-inset ring-indigo-500/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center rounded-t-none z-10 pointer-events-none">
                    <p className="text-indigo-300 font-medium">Drop files to attach</p>
                </div>
            )}

            {/* Reply banner */}
            {replyTo && (
                <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2 mb-3">
                    <div className="min-w-0">
                        <p className="text-xs text-indigo-400 font-medium">{replyTo.senderName}</p>
                        <p className="text-xs text-slate-400 truncate">{replyTo.content || "📎 Attachment"}</p>
                    </div>
                    <button
                        onClick={onClearReply}
                        className="ml-2 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* File previews */}
            {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {pendingFiles.map((p) => (
                        <div key={p.id} className="relative group">
                            {p.previewUrl ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                                    <img src={p.previewUrl} alt={p.file.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-2">
                                    {getFileIcon(p.file.type)}
                                    <span className="text-xs text-slate-300 max-w-24 truncate">{p.file.name}</span>
                                </div>
                            )}
                            <button
                                onClick={() => removeFile(p.id)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <X size={10} className="text-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 mb-2">
                    <AlertCircle size={12} /> {error}
                </div>
            )}

            {/* Input row */}
            <div className="flex items-end gap-2">
                {/* Attach */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0 self-end mb-0.5"
                    title="Attach file"
                >
                    <Paperclip size={18} />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_FILES}
                    className="hidden"
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                />

                {/* Textarea */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all overflow-hidden"
                        style={{ minHeight: 44, maxHeight: 160 }}
                        disabled={isSending}
                    />
                </div>

                {/* Emoji */}
                <div className="relative shrink-0 self-end mb-0.5">
                    <button
                        onClick={() => setShowEmoji((v) => !v)}
                        className={cn(
                            "p-2 rounded-xl transition-colors",
                            showEmoji ? "bg-white/10 text-yellow-400" : "hover:bg-white/10 text-slate-400 hover:text-white"
                        )}
                        title="Emoji"
                    >
                        <Smile size={18} />
                    </button>
                    {showEmoji && (
                        <div className="absolute bottom-12 right-0 z-30">
                            <EmojiPicker
                                onEmojiClick={(emojiData: EmojiClickData) => handleEmojiSelect({ native: emojiData.emoji })}
                                theme={Theme.DARK}
                                lazyLoadEmojis
                            />
                        </div>
                    )}
                </div>

                {/* Send */}
                <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={cn(
                        "p-2.5 rounded-xl transition-all shrink-0 self-end mb-0.5",
                        canSend
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                            : "bg-white/5 text-slate-600 cursor-not-allowed"
                    )}
                    title="Send"
                >
                    <Send size={16} className={isSending ? "animate-pulse" : ""} />
                </button>
            </div>

            <p className="text-xs text-slate-600 mt-2 text-center">
                Press <kbd className="font-mono text-slate-500">Enter</kbd> to send ·{" "}
                <kbd className="font-mono text-slate-500">Shift+Enter</kbd> for new line
            </p>
        </div>
    );
}