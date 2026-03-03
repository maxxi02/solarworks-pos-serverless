"use client";

import { useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Users } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { MessageBubble, DateSeparator, isSameGroup, needsDateSeparator } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import type { ConversationWithDetails, Message, OptimisticMessage } from "@/types/messaging.types";
import { cn } from "@/lib/utils";

type DisplayMessage = Message | OptimisticMessage;

interface ChatWindowProps {
  conversation: ConversationWithDetails;
  currentUserId: string;
  currentUserName: string;
  currentUserImage?: string;
  onBack?: () => void;
}

export function ChatWindow({
  conversation,
  currentUserId,
  currentUserName,
  currentUserImage,
  onBack,
}: ChatWindowProps) {
  const conversationId = conversation._id as string;
  const isGroup = conversation.isGroup;

  const {
    messages, isLoading, hasMore, loadMore,
    sendMessage, typingUsers, startTyping, stopTyping,
  } = useMessages(conversationId, currentUserId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

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

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop < 80 && hasMore && !isLoading) {
      handleLoadMore();
    }
  }, [hasMore, isLoading, handleLoadMore]);

  const handleSend = useCallback((content: string) => {
    sendMessage(content, currentUserName, currentUserImage);
  }, [sendMessage, currentUserName, currentUserImage]);

  // ── Header display ────────────────────────────────────────────
  const headerTitle = isGroup
    ? conversation.groupName
    : conversation.otherParticipant?.name;

  const headerSubtitle = () => {
    if (isGroup) {
      const count = conversation.participants?.length ?? 0;
      return `${count} member${count !== 1 ? "s" : ""}`;
    }
    const other = conversation.otherParticipant;
    if (!other) return "";
    if (other.isOnline) return "Online";
    if (!other.lastSeen) return "Offline";
    const diff = Date.now() - new Date(other.lastSeen).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Last seen just now";
    if (mins < 60) return `Last seen ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Last seen ${hrs}h ago`;
    return `Last seen ${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0 z-10 animate-in fade-in duration-200">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 md:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <div className="relative flex-shrink-0">
          {isGroup ? (
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          ) : (
            <>
              <Avatar className="h-9 w-9">
                <AvatarImage src={conversation.otherParticipant?.image} />
                <AvatarFallback className="text-sm font-medium">
                  {headerTitle?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {conversation.otherParticipant?.isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              )}
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{headerTitle}</p>
          <p className="text-[11px] text-muted-foreground">{headerSubtitle()}</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 transition-colors overscroll-contain"
        onScroll={handleScroll}
        data-lenis-prevent
        data-lenis-scroll-container
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              : <button className="text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={handleLoadMore}>Load older messages</button>
            }
          </div>
        )}

        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
              <p className="text-xs text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in-95 duration-300">
            {isGroup ? (
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
            ) : (
              <Avatar className="h-16 w-16 mb-4">
                <AvatarImage src={conversation.otherParticipant?.image} />
                <AvatarFallback className="text-2xl">
                  {headerTitle?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <p className="font-semibold text-base">{headerTitle}</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-[200px]">
              {isGroup ? "Group created. Start the conversation!" : `This is the beginning of your chat with ${headerTitle}.`}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              isGroup={isGroup}
              conversation={conversation}
            />
          </div>
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2 mt-2 animate-in slide-in-from-bottom-2 duration-200">
            <div className="w-7 flex-shrink-0" />
            <div className="flex flex-col gap-1">
              {isGroup && (
                <span className="text-[10px] text-muted-foreground px-1">
                  {typingUsers.map((u) => u.userName).join(", ")} is typing...
                </span>
              )}
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 w-fit">
                <TypingDots />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 bg-background/80 backdrop-blur-sm">
        <MessageInput onSend={handleSend} onTypingStart={startTyping} onTypingStop={stopTyping} />
      </div>
    </div>
  );
}

// ─── Message list ─────────────────────────────────────────────────

function MessageList({
  messages,
  currentUserId,
  isGroup,
  conversation,
}: {
  messages: DisplayMessage[];
  currentUserId: string;
  isGroup: boolean;
  conversation: ConversationWithDetails;
}) {
  return (
    <div className="flex flex-col gap-1">
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const isOwn = msg.senderId === currentUserId;
        const showDate = !prev || needsDateSeparator(prev, msg);
        const inSameGroupAsNext = next && isSameGroup(msg, next);
        const showAvatar = !isOwn && !inSameGroupAsNext;
        const showTimestamp = !inSameGroupAsNext;

        // For group chats show sender name above bubble
        const showSenderName = isGroup && !isOwn && (!prev || prev.senderId !== msg.senderId);

        // Find sender details from participant list
        const senderDetails = isGroup
          ? conversation.members?.find((m) => m.userId === msg.senderId)
          : conversation.otherParticipant;

        return (
          <div key={msg._id as string}>
            {showDate && <DateSeparator date={new Date(msg.createdAt)} />}
            {showSenderName && (
              <p className="text-[10px] font-medium text-muted-foreground ml-9 mb-0.5 mt-2 transition-all">
                {msg.senderName}
              </p>
            )}
            <MessageBubble
              message={msg}
              isOwn={isOwn}
              showAvatar={showAvatar}
              showTimestamp={showTimestamp}
              otherParticipantName={senderDetails?.name ?? msg.senderName}
              otherParticipantImage={senderDetails?.image}
            />
          </div>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 h-3">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }} />
      ))}
    </div>
  );
}