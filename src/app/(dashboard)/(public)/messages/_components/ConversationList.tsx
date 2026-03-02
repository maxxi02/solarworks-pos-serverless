"use client";

import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import type { ConversationWithDetails } from "@/types/messaging.types";
import { Search, MessageSquarePlus, Users, Loader2, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ConversationListProps {
    conversations: ConversationWithDetails[];
    isLoading: boolean;
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onStartNewDM: (targetUserId: string) => void;
    onCreateGroup: (groupName: string, memberIds: string[]) => void;
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

type PanelMode = "none" | "dm" | "group";

export function ConversationList({
    conversations,
    isLoading,
    activeConversationId,
    onSelectConversation,
    onStartNewDM,
    onCreateGroup,
    currentUserId,
}: ConversationListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [panelMode, setPanelMode] = useState<PanelMode>("none");

    const [allUsers, setAllUsers] = useState<UserSearchResult[]>([]);
    const [isUsersLoading, setIsUsersLoading] = useState(false);

    // Group state
    const [groupSearch, setGroupSearch] = useState("");
    const [groupResults, setGroupResults] = useState<UserSearchResult[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([]);
    const [groupName, setGroupName] = useState("");
    const [groupStep, setGroupStep] = useState<"members" | "name">("members");

    const [isSearching, setIsSearching] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

    // Fetch all staff/admins on load
    useEffect(() => {
        const fetchUsers = async () => {
            setIsUsersLoading(true);
            try {
                const res = await fetch('/api/users/search?q='); // Empty query returns default list
                const data = await res.json() as { users: UserSearchResult[] };
                setAllUsers(data.users || []);
            } catch (err) {
                console.error("Failed to fetch users:", err);
            } finally {
                setIsUsersLoading(false);
            }
        };
        fetchUsers();
    }, []);

    // Filter conversations based on search
    const filteredConversations = conversations.filter((c) => {
        const name = c.isGroup ? c.groupName : c.otherParticipant?.name;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Get user IDs of people we already have conversations with (to exclude from "Available Contacts")
    const usersInConversations = new Set<string>();
    conversations.forEach(c => {
        if (!c.isGroup && c.otherParticipant) {
            usersInConversations.add(c.otherParticipant.userId);
        }
    });

    // Available contacts: users who don't have a conversation yet
    const availableContacts = allUsers.filter(u =>
        u.id !== currentUserId &&
        !usersInConversations.has(u.id) &&
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Search logic for Group Panel ONLY
    useEffect(() => {
        if (panelMode !== "group") return;

        if (groupSearch.length === 1) {
            setGroupResults([]);
            return;
        }

        clearTimeout(searchTimer.current!);
        searchTimer.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(groupSearch)}`);
                const data = await res.json() as { users: UserSearchResult[] };
                setGroupResults((data.users || []).filter(
                    (u) => !selectedMembers.some((m) => m.id === u.id)
                ));
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, [groupSearch, panelMode, selectedMembers]);

    const closePanel = () => {
        setPanelMode("none");
        setGroupSearch("");
        setGroupResults([]);
        setSelectedMembers([]);
        setGroupName("");
        setGroupStep("members");
    };

    const handleStartDM = (userId: string) => {
        onStartNewDM(userId);
        closePanel();
    };

    const toggleMember = (user: UserSearchResult) => {
        setSelectedMembers((prev) =>
            prev.some((m) => m.id === user.id)
                ? prev.filter((m) => m.id !== user.id)
                : [...prev, user]
        );
        setGroupSearch("");
        setGroupResults([]);
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) return;
        setIsCreating(true);
        try {
            onCreateGroup(groupName.trim(), selectedMembers.map((m) => m.id));
            closePanel();
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="flex flex-col h-full border-r border-border bg-card">
            {/* Header */}
            <div className="px-4 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold tracking-tight">Messages</h2>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => panelMode === "group" ? closePanel() : (closePanel(), setPanelMode("group"))}
                            title="New group"
                        >
                            <Users className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Group creation panel */}
                {panelMode === "group" && (
                    <div className="space-y-2 mb-2">
                        {groupStep === "members" ? (
                            <>
                                <p className="text-xs text-muted-foreground">Select members to add</p>

                                {/* Selected members chips */}
                                {selectedMembers.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedMembers.map((m) => (
                                            <span key={m.id} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                                {m.name}
                                                <button onClick={() => toggleMember(m)}><X className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input autoFocus placeholder="Search people..." className="pl-8 h-8 text-sm"
                                        value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} />
                                </div>

                                {isSearching && <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                                {groupResults.length > 0 && (
                                    <div className="rounded-md border bg-popover shadow-md overflow-hidden max-h-48 overflow-y-auto">
                                        {groupResults.map((user) => {
                                            const isSelected = selectedMembers.some((m) => m.id === user.id);
                                            return (
                                                <button key={user.id} onClick={() => toggleMember(user)}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left">
                                                    <Avatar className="h-7 w-7 flex-shrink-0">
                                                        <AvatarImage src={user.image} />
                                                        <AvatarFallback className="text-xs">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{user.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                                                    </div>
                                                    {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <Button
                                    className="w-full h-8 text-sm" size="sm"
                                    disabled={selectedMembers.length === 0}
                                    onClick={() => setGroupStep("name")}
                                >
                                    Next ({selectedMembers.length} selected)
                                </Button>
                                <Button variant="ghost" className="w-full h-8 text-sm" size="sm" onClick={closePanel}>
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setGroupStep("members")}
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                    ← Back
                                </button>
                                <p className="text-xs text-muted-foreground">
                                    {selectedMembers.length + 1} members (including you)
                                </p>
                                <Input
                                    autoFocus placeholder="Group name..." className="h-8 text-sm"
                                    value={groupName} onChange={(e) => setGroupName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                                />
                                <Button
                                    className="w-full h-8 text-sm" size="sm"
                                    disabled={!groupName.trim() || isCreating}
                                    onClick={handleCreateGroup}
                                >
                                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Group"}
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {/* Search existing conversations and all users */}
                {panelMode === "none" && (
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Search people or groups..." className="pl-8 h-8 text-sm"
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                )}
            </div>

            {/* Combined list */}
            <ScrollArea className="flex-1">
                {isLoading || (searchQuery === "" && isUsersLoading) ? (
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
                ) : (
                    <div className="py-1">
                        {/* 1. Conversations Section */}
                        {filteredConversations.length > 0 && (
                            <div className="space-y-1">
                                <div className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Conversations</div>
                                {filteredConversations.map((conv) => (
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

                        {/* 2. Available Contacts Section */}
                        {availableContacts.length > 0 && (
                            <div className="mt-4 space-y-1">
                                <div className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Other Contacts</div>
                                {availableContacts.map((user) => (
                                    <button key={user.id} onClick={() => handleStartDM(user.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/60 transition-colors text-left">
                                        <div className="relative flex-shrink-0">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={user.image} />
                                                <AvatarFallback className="text-sm font-medium">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {user.isOnline && (
                                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-sm font-medium truncate">{user.name}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate capitalize">{user.role}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {filteredConversations.length === 0 && availableContacts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No results found for "{searchQuery}"
                                </p>
                            </div>
                        )}
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
    const { lastMessage, unreadCount, isGroup } = conversation;
    const hasUnread = (unreadCount || 0) > 0;

    const displayName = isGroup
        ? conversation.groupName
        : conversation.otherParticipant?.name;

    const displayImage = isGroup
        ? conversation.groupImage
        : conversation.otherParticipant?.image;

    const isOnline = !isGroup && conversation.otherParticipant?.isOnline;

    const lastMsgText = lastMessage
        ? lastMessage.senderId === currentUserId
            ? `You: ${lastMessage.content}`
            : isGroup && lastMessage.senderName
                ? `${lastMessage.senderName}: ${lastMessage.content}`
                : lastMessage.content
        : "Start a conversation";

    return (
        <button onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/60 transition-colors text-left",
                isActive && "bg-accent"
            )}>
            <div className="relative flex-shrink-0">
                {isGroup ? (
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                    </div>
                ) : (
                    <>
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={displayImage} />
                            <AvatarFallback className="text-sm font-medium">
                                {displayName?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                        )}
                    </>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className={cn("text-sm truncate", hasUnread ? "font-semibold" : "font-medium")}>
                        {displayName}
                    </span>
                    {lastMessage && (
                        <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-1">
                            {formatDistanceToNow(new Date(lastMessage.sentAt), { addSuffix: false })}
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <p className={cn("text-xs truncate", hasUnread ? "text-foreground" : "text-muted-foreground")}>
                        {lastMsgText}
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