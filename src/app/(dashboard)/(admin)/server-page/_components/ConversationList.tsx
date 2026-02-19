"use client";

import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

import { Search, MessageSquarePlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ConversationWithDetails } from "@/types/messaging.types";

interface ConversationListProps {
    conversations: ConversationWithDetails[];
    isLoading: boolean;
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onStartNewDM: (targetUserId: string) => void;
    currentUserId: string;
}

interface UserSearchResult {
    id: string;
    name: string;
    image?: string;
    email: string;
    isOnline: boolean;
    role: string;
}

export function ConversationList({
    conversations,
    isLoading,
    activeConversationId,
    onSelectConversation,
    onStartNewDM,
    currentUserId,
}: ConversationListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showNewDM, setShowNewDM] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

    // Filter existing conversations by name
    const filtered = conversations.filter((c) =>
        c.otherParticipant.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Search users for new DM
    useEffect(() => {
        if (!showNewDM) return;
        if (userSearch.length < 2) {
            setUserResults([]);
            return;
        }

        clearTimeout(searchTimer.current!);
        searchTimer.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(userSearch)}`);
                const data = await res.json();
                setUserResults(data.users || []);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, [userSearch, showNewDM]);

    const handleStartDM = (userId: string) => {
        onStartNewDM(userId);
        setShowNewDM(false);
        setUserSearch("");
        setUserResults([]);
    };

    return (
        <div className="flex flex-col h-full border-r border-border bg-card">
            {/* Header */}
            <div className="px-4 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold tracking-tight">Messages</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowNewDM((v) => !v)}
                        title="New message"
                    >
                        <MessageSquarePlus className="h-4 w-4" />
                    </Button>
                </div>

                {/* New DM search */}
                {showNewDM ? (
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                autoFocus
                                placeholder="Search people..."
                                className="pl-8 h-8 text-sm"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                            />
                        </div>
                        {isSearching && (
                            <div className="flex justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {userResults.length > 0 && (
                            <div className="rounded-md border bg-popover shadow-md overflow-hidden">
                                {userResults.map((user) => (
                                    <button
                                        key={user.id}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left"
                                        onClick={() => handleStartDM(user.id)}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={user.image} />
                                                <AvatarFallback className="text-xs">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {user.isOnline && (
                                                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-background" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{user.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Filter existing conversations */
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search conversations..."
                            className="pl-8 h-8 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Conversation list */}
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="flex flex-col gap-2 p-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={`skeleton-${i}`} className="flex items-center gap-3 px-2 py-2">
                                <div className="h-9 w-9 rounded-full bg-muted animate-pulse flex-shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                                    <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <MessageSquarePlus className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? "No conversations match" : "No messages yet"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Use the + button to start a conversation
                        </p>
                    </div>
                ) : (
                    <div className="py-1">
                        {filtered.map((conv) => (
                            <ConversationItem
                                key={conv._id as string}
                                conversation={conv}
                                isActive={activeConversationId === conv._id}
                                currentUserId={currentUserId}
                                onClick={() => onSelectConversation(conv._id as string)}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

// ─── Single conversation row ──────────────────────────────────────

function ConversationItem({
    conversation,
    isActive,
    currentUserId,
    onClick,
}: {
    conversation: ConversationWithDetails;
    isActive: boolean;
    currentUserId: string;
    onClick: () => void;
}) {
    const { otherParticipant, lastMessage, unreadCount } = conversation;
    const hasUnread = (unreadCount || 0) > 0;

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/60 transition-colors text-left",
                isActive && "bg-accent"
            )}
        >
            {/* Avatar with online dot */}
            <div className="relative flex-shrink-0">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={otherParticipant.image} />
                    <AvatarFallback className="text-sm font-medium">
                        {otherParticipant.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                {otherParticipant.isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                )}
            </div>

            {/* Conversation info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span
                        className={cn(
                            "text-sm truncate",
                            hasUnread ? "font-semibold" : "font-medium"
                        )}
                    >
                        {otherParticipant.name}
                    </span>
                    {lastMessage && (
                        <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-1">
                            {formatDistanceToNow(new Date(lastMessage.sentAt), {
                                addSuffix: false,
                            })}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <p
                        className={cn(
                            "text-xs truncate",
                            hasUnread ? "text-foreground" : "text-muted-foreground"
                        )}
                    >
                        {lastMessage
                            ? lastMessage.senderId === currentUserId
                                ? `You: ${lastMessage.content}`
                                : lastMessage.content
                            : "Start a conversation"}
                    </p>
                    {hasUnread && (
                        <Badge className="h-4 min-w-4 px-1 text-[10px] ml-1 flex-shrink-0 bg-primary">
                            {unreadCount! > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </div>
            </div>
        </button>
    );
}