"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Hash, SquarePen, Search } from "lucide-react";
import { UserPicker } from "./UserPicker";
import type {
    SerializedConversation,
    ChatUser,
    UseChatReturn,
} from "@/types/chat.type";

interface ConversationListProps {
    conversations: SerializedConversation[];
    selectedId: string | null;
    localUnread: Record<string, number>;
    allUsers: ChatUser[];
    isLoadingUsers: boolean;
    currentUserId: string;
    isLoadingConversations: boolean;
    getDisplayName: UseChatReturn["getDisplayName"];
    getOtherUserAvatar: UseChatReturn["getOtherUserAvatar"];
    onSelect: (id: string) => void;
    onStartDM: (user: ChatUser) => void;
}

const formatLastMessageTime = (iso?: string): string => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
};

export function ConversationList({
    conversations,
    selectedId,
    localUnread,
    allUsers,
    isLoadingUsers,
    currentUserId,
    isLoadingConversations,
    getDisplayName,
    getOtherUserAvatar,
    onSelect,
    onStartDM,
}: ConversationListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);

    const groups = conversations.filter((c) => c.type === "group");
    const dms = conversations.filter((c) => c.type === "direct");

    const filteredGroups = groups.filter((c) =>
        getDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredDMs = dms.filter((c) =>
        getDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const ConvRow = ({ conv }: { conv: SerializedConversation }) => {
        const isSelected = conv._id === selectedId;
        const unread = localUnread[conv._id] ?? 0;
        const name = getDisplayName(conv);
        const avatarUrl = conv.type === "direct" ? getOtherUserAvatar(conv) : "";

        return (
            <button
                onClick={() => onSelect(conv._id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
            >
                {/* Avatar / icon */}
                <div className="relative shrink-0">
                    {conv.type === "group" ? (
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${isSelected ? "bg-primary-foreground/20" : "bg-muted"
                                }`}
                        >
                            <Hash
                                className={`h-5 w-5 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"
                                    }`}
                            />
                        </div>
                    ) : avatarUrl ? (
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={avatarUrl} alt={name} />
                            <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    ) : (
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${isSelected ? "bg-primary-foreground/20" : "bg-muted"
                                }`}
                        >
                            <span className="text-sm font-semibold">
                                {name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}

                    {unread > 0 && (
                        <Badge className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 p-0 text-[9px] leading-none text-white">
                            {unread > 9 ? "9+" : unread}
                        </Badge>
                    )}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                        <p
                            className={`truncate text-sm font-semibold ${unread > 0 && !isSelected ? "text-foreground" : ""
                                }`}
                        >
                            {name}
                        </p>
                        <span
                            className={`shrink-0 text-[10px] ${isSelected
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                                }`}
                        >
                            {formatLastMessageTime(conv.lastMessage?.timestamp)}
                        </span>
                    </div>
                    {conv.lastMessage && (
                        <p
                            className={`truncate text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                                } ${unread > 0 && !isSelected ? "font-medium" : ""}`}
                        >
                            {conv.lastMessage.content}
                        </p>
                    )}
                </div>
            </button>
        );
    };

    return (
        <div className="relative flex h-full flex-col">
            {/* Search + compose */}
            <div className="border-b p-3">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="h-8 pl-8 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setIsUserPickerOpen(true)}
                        title="New direct message"
                    >
                        <SquarePen className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-4 p-2">
                    {/* Channels */}
                    {filteredGroups.length > 0 && (
                        <div>
                            <div className="mb-1 flex items-center gap-1 px-3">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Channels
                                </span>
                            </div>
                            {filteredGroups.map((c) => (
                                <ConvRow key={c._id} conv={c} />
                            ))}
                        </div>
                    )}

                    {/* Direct Messages */}
                    <div>
                        <div className="mb-1 flex items-center justify-between px-3">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Direct Messages
                            </span>
                        </div>
                        {isLoadingConversations ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">
                                Loading...
                            </p>
                        ) : filteredDMs.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">
                                {searchQuery ? "No matches" : "No direct messages yet"}
                            </p>
                        ) : (
                            filteredDMs.map((c) => <ConvRow key={c._id} conv={c} />)
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* User picker overlay — rendered inside the sidebar */}
            {isUserPickerOpen && (
                <UserPicker
                    users={allUsers}
                    isLoading={isLoadingUsers}
                    currentUserId={currentUserId}
                    onSelect={onStartDM}
                    onClose={() => setIsUserPickerOpen(false)}
                />
            )}
        </div>
    );
}