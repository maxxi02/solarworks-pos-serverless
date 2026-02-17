"use client";

import { useState } from "react";
import { CheckCheck, Download, FileText, Music, Reply, MoreHorizontal } from "lucide-react";
import { MessageWithId, Attachment } from "@/types/chat.types";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

function formatTime(date: Date | string) {
    const d = new Date(date);
    return format(d, "h:mm a");
}

export function formatDateSeparator(date: Date | string) {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
}

// ─── Attachment renderers ─────────────────────────────────────────

function ImageAttachment({ att }: { att: Attachment }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="relative group overflow-hidden rounded-xl border border-white/10 max-w-xs"
            >
                <img
                    src={att.thumbnailUrl ?? att.url}
                    alt={att.name}
                    className="max-w-full max-h-60 object-cover group-hover:opacity-90 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setOpen(false)}
                >
                    <img src={att.url} alt={att.name} className="max-w-full max-h-full rounded-lg object-contain" />
                    <a
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Download size={16} />
                    </a>
                </div>
            )}
        </>
    );
}

function VideoAttachment({ att }: { att: Attachment }) {
    return (
        <video
            src={att.url}
            controls
            className="rounded-xl border border-white/10 max-w-xs max-h-60 object-cover"
        />
    );
}

function AudioAttachment({ att }: { att: Attachment }) {
    return (
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 max-w-xs border border-white/10">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Music size={14} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate mb-1">{att.name}</p>
                <audio src={att.url} controls className="w-full h-6" style={{ height: 24 }} />
            </div>
        </div>
    );
}

function DocumentAttachment({ att }: { att: Attachment }) {
    const sizeLabel =
        att.size > 1024 * 1024
            ? `${(att.size / 1024 / 1024).toFixed(1)} MB`
            : `${Math.round(att.size / 1024)} KB`;

    const ext = att.name.split(".").pop()?.toUpperCase() ?? "FILE";

    return (
        <a
            href={att.url}
            target="_blank"
            rel="noreferrer"
            download={att.name}
            className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 max-w-xs border border-white/10 transition-colors group"
        >
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate font-medium">{att.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                    {ext} · {sizeLabel}
                </p>
            </div>
            <Download size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
        </a>
    );
}

function AttachmentRenderer({ att }: { att: Attachment }) {
    switch (att.type) {
        case "image": return <ImageAttachment att={att} />;
        case "video": return <VideoAttachment att={att} />;
        case "audio": return <AudioAttachment att={att} />;
        case "document":
        default: return <DocumentAttachment att={att} />;
    }
}

// ─── Date separator ───────────────────────────────────────────────

export function DateSeparator({ date }: { date: Date | string }) {
    return (
        <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-slate-500 font-medium px-3 py-1 bg-slate-800/60 rounded-full border border-white/8">
                {formatDateSeparator(date)}
            </span>
            <div className="flex-1 h-px bg-white/8" />
        </div>
    );
}

// ─── Main message bubble ──────────────────────────────────────────

interface MessageBubbleProps {
    message: MessageWithId;
    isOwn: boolean;
    showAvatar: boolean;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    onReply?: (message: MessageWithId) => void;
}

export function MessageBubble({
    message,
    isOwn,
    showAvatar,
    isFirstInGroup,
    isLastInGroup,
    onReply,
}: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false);
    const hasContent = message.content?.trim();
    const hasAttachments = message.attachments?.length > 0;

    return (
        <div
            className={cn("flex gap-2.5 px-4 group", isOwn ? "flex-row-reverse" : "flex-row", isLastInGroup ? "mb-3" : "mb-0.5")}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Avatar */}
            <div className="w-8 shrink-0 self-end">
                {!isOwn && showAvatar && (
                    message.senderAvatar ? (
                        <img src={message.senderAvatar} alt={message.senderName} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{
                                background: `hsl(${message.senderName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360},55%,40%)`,
                            }}
                        >
                            {message.senderName.slice(0, 2).toUpperCase()}
                        </div>
                    )
                )}
            </div>

            {/* Bubble */}
            <div className={cn("flex flex-col max-w-[75%]", isOwn ? "items-end" : "items-start")}>
                {/* Sender name */}
                {!isOwn && isFirstInGroup && (
                    <span className="text-xs text-slate-400 font-medium mb-1 ml-1">{message.senderName}</span>
                )}

                {/* Reply preview */}
                {message.replyTo && (
                    <div
                        className={cn(
                            "flex items-start gap-2 px-3 py-2 rounded-lg mb-1 border-l-2 border-indigo-400 bg-white/5 max-w-full",
                            isOwn ? "items-end" : "items-start"
                        )}
                    >
                        <div className="min-w-0">
                            <p className="text-xs text-indigo-400 font-medium truncate">{message.replyTo.senderName}</p>
                            <p className="text-xs text-slate-400 truncate">{message.replyTo.content}</p>
                        </div>
                    </div>
                )}

                {/* Content bubble */}
                <div className="relative">
                    {(hasContent || hasAttachments) && (
                        <div
                            className={cn(
                                "relative rounded-2xl px-4 py-2.5",
                                isOwn
                                    ? "bg-indigo-600 text-white rounded-br-sm"
                                    : "bg-slate-800 text-slate-100 rounded-bl-sm",
                                isFirstInGroup && isOwn && "rounded-tr-2xl",
                                isFirstInGroup && !isOwn && "rounded-tl-2xl"
                            )}
                        >
                            {/* Attachments */}
                            {hasAttachments && (
                                <div className={cn("flex flex-col gap-2", hasContent ? "mb-2" : "")}>
                                    {message.attachments.map((att, i) => (
                                        <AttachmentRenderer key={i} att={att} />
                                    ))}
                                </div>
                            )}

                            {/* Text */}
                            {hasContent && (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                        </div>
                    )}

                    {/* Hover actions */}
                    {showActions && (
                        <div
                            className={cn(
                                "absolute top-1/2 -translate-y-1/2 flex items-center gap-1",
                                isOwn ? "-left-20" : "-right-20"
                            )}
                        >
                            {onReply && (
                                <button
                                    onClick={() => onReply(message)}
                                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                                    title="Reply"
                                >
                                    <Reply size={13} />
                                </button>
                            )}
                            <button
                                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                                title="More"
                            >
                                <MoreHorizontal size={13} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Timestamp */}
                {isLastInGroup && (
                    <div className={cn("flex items-center gap-1 mt-1 px-1", isOwn ? "flex-row-reverse" : "")}>
                        <span className="text-xs text-slate-500">{formatTime(message.createdAt)}</span>
                        {isOwn && <CheckCheck size={12} className="text-indigo-400" />}
                    </div>
                )}
            </div>
        </div>
    );
}