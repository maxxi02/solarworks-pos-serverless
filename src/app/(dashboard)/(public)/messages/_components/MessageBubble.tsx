"use client";

import { memo, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, Clock, Download, FileIcon, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, OptimisticMessage, MessageAttachment } from "@/types/messaging.types";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";

type DisplayMessage = Message | OptimisticMessage;

interface MessageBubbleProps {
    message: DisplayMessage;
    isOwn: boolean;
    showAvatar: boolean;
    showTimestamp: boolean;
    otherParticipantName: string;
    otherParticipantImage?: string;
}

export const MessageBubble = memo(function MessageBubble({
    message,
    isOwn,
    showAvatar,
    showTimestamp,
    otherParticipantName,
    otherParticipantImage,
}: MessageBubbleProps) {
    const isOptimistic = "status" in message;
    const status = isOptimistic ? message.status : "sent";
    const readByOthers =
        isOwn && (message.readBy || []).some((r) => r.userId !== message.senderId);

    const hasAttachments = (message.attachments || []).length > 0;
    const hasText = message.content.trim().length > 0 && message.content.trim() !== " ";

    return (
        <div className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
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
            <div className={cn("flex flex-col gap-1 max-w-[70%]", isOwn ? "items-end" : "items-start")}>
                {/* Attachments */}
                {hasAttachments && (
                    <div className="flex flex-col gap-1.5">
                        {(message.attachments || []).map((att, idx) => (
                            <AttachmentRenderer
                                key={idx}
                                attachment={att}
                                isOwn={isOwn}
                                faded={status === "sending"}
                            />
                        ))}
                    </div>
                )}

                {/* Text content (with link detection) */}
                {hasText && (
                    <div
                        className={cn(
                            "px-3 py-2 rounded-2xl text-sm leading-relaxed [overflow-wrap:anywhere] break-words overflow-hidden",
                            isOwn
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm",
                            status === "sending" && "opacity-60"
                        )}
                    >
                        <LinkifiedText text={message.content} isOwn={isOwn} />
                    </div>
                )}

                {/* Timestamp + status */}
                {showTimestamp && (
                    <div className={cn("flex items-center gap-1 px-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                        <span className="text-[11px] text-muted-foreground">
                            {formatMessageTime(new Date(message.createdAt))}
                        </span>
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
});

// ─── Attachment Renderer ─────────────────────────────────────────

function AttachmentRenderer({
    attachment,
    isOwn,
    faded,
}: {
    attachment: MessageAttachment;
    isOwn: boolean;
    faded?: boolean;
}) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const isImage = attachment.mimeType.startsWith("image/");

    if (isImage) {
        return (
            <>
                <button
                    onClick={() => setLightboxOpen(true)}
                    className={cn(
                        "block rounded-xl overflow-hidden border border-border max-w-[240px] cursor-zoom-in",
                        faded && "opacity-60",
                        isOwn ? "rounded-br-sm" : "rounded-bl-sm"
                    )}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={attachment.thumbnailUrl || attachment.url}
                        alt={attachment.name}
                        className="w-full max-h-60 object-cover"
                        loading="lazy"
                    />
                </button>
                <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                    <DialogContent className="max-w-4xl p-2 bg-black/90 border-none">
                        <DialogTitle className="sr-only">{attachment.name}</DialogTitle>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-full max-h-[85vh] object-contain rounded-lg"
                        />
                        <div className="flex items-center justify-end mt-2 gap-2">
                            <span className="text-xs text-white/70">{attachment.name}</span>
                            <a
                                href={attachment.url}
                                download={attachment.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-white/70 hover:text-white flex items-center gap-1"
                            >
                                <Download className="h-3 w-3" /> Download
                            </a>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // File card
    return (
        <a
            href={attachment.url}
            download={attachment.name}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-muted/60 hover:bg-muted transition-colors min-w-[200px] max-w-[280px] group",
                faded && "opacity-60",
                isOwn ? "rounded-br-sm" : "rounded-bl-sm"
            )}
        >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{attachment.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.size)}</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </a>
    );
}

// ─── Link detection in text ──────────────────────────────────────

const URL_REGEX = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;

function LinkifiedText({ text, isOwn }: { text: string; isOwn: boolean }) {
    const parts = text.split(URL_REGEX);
    return (
        <>
            {parts.map((part, i) => {
                if (!part.match(URL_REGEX)) return <span key={i}>{part}</span>;
                const href = part.startsWith("http") ? part : `https://${part}`;
                return (
                    <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "inline-flex items-center gap-0.5 underline underline-offset-2 break-all",
                            isOwn ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-primary hover:text-primary/80"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                        <ExternalLink className="h-3 w-3 shrink-0 inline" />
                    </a>
                );
            })}
        </>
    );
}

// ─── Date separator ──────────────────────────────────────────────

export function DateSeparator({ date }: { date: Date }) {
    let label: string;
    if (isToday(date)) label = "Today";
    else if (isYesterday(date)) label = "Yesterday";
    else label = format(date, "MMMM d, yyyy");

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

// ─── Helpers ─────────────────────────────────────────────────────

function formatMessageTime(date: Date): string {
    return format(date, "h:mm a");
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isSameGroup(a: DisplayMessage, b: DisplayMessage): boolean {
    if (a.senderId !== b.senderId) return false;
    const diff = Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) / 1000;
    return diff < 120;
}

export function needsDateSeparator(a: DisplayMessage, b: DisplayMessage): boolean {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return (
        dateA.getFullYear() !== dateB.getFullYear() ||
        dateA.getMonth() !== dateB.getMonth() ||
        dateA.getDate() !== dateB.getDate()
    );
}