"use client";

import { useState } from "react";
import { Search, Plus, Hash, MessageCircle, Users, ChevronDown, ChevronRight } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { ConversationWithId } from "@/types/chat.types";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";

interface ConversationSidebarProps {
    currentUserId: string;
    currentUserRole: string;
    onNewGroup: () => void;
    onNewDM: () => void;
}

function getConversationDisplayName(conv: ConversationWithId, currentUserId: string): string {
    if (conv.type === "group") return conv.name ?? "Group";
    const other = conv.participants.find((p) => p.userId !== currentUserId);
    return other?.userName ?? "Direct Message";
}

function getConversationAvatar(conv: ConversationWithId, currentUserId: string): string | undefined {
    if (conv.type === "group") return conv.avatar;
    const other = conv.participants.find((p) => p.userId !== currentUserId);
    return other?.userAvatar;
}

function AvatarFallback({ name, size = 32 }: { name: string; size?: number }) {
    const initials = name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
    const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    return (
        <div
            style={{ width: size, height: size, background: `hsl(${hue},55%,40%)`, fontSize: size * 0.38 }}
            className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
        >
            {initials}
        </div>
    );
}

function ConversationItem({
    conv,
    currentUserId,
    isActive,
    onSelect,
}: {
    conv: ConversationWithId;
    currentUserId: string;
    isActive: boolean;
    onSelect: () => void;
}) {
    const name = getConversationDisplayName(conv, currentUserId);
    const avatar = getConversationAvatar(conv, currentUserId);
    const unread = conv.unreadCounts?.[currentUserId] ?? 0;
    const lastMsg = conv.lastMessage;

    return (
        <button
            onClick={onSelect}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group",
                isActive
                    ? "bg-indigo-500/20 text-white"
                    : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
            )}
        >
            <div className="relative shrink-0">
                {avatar ? (
                    <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                    <AvatarFallback name={name} size={36} />
                )}
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-medium truncate", unread > 0 && "text-white font-semibold")}>
                        {name}
                    </span>
                    {lastMsg && (
                        <span className="text-xs text-slate-500 shrink-0 ml-2">
                            {formatDistanceToNowStrict(new Date(lastMsg.sentAt), { addSuffix: false })}
                        </span>
                    )}
                </div>
                {lastMsg && (
                    <p className={cn("text-xs truncate mt-0.5", unread > 0 ? "text-slate-300" : "text-slate-500")}>
                        {conv.type === "group" && `${lastMsg.senderName}: `}
                        {lastMsg.hasAttachment && !lastMsg.content ? "📎 Attachment" : lastMsg.content}
                    </p>
                )}
            </div>
        </button>
    );
}

export function ConversationSidebar({
    currentUserId,
    currentUserRole,
    onNewGroup,
    onNewDM,
}: ConversationSidebarProps) {
    const { getFilteredConversations, activeConversationId, setActiveConversation, setSearchQuery, searchQuery } =
        useChatStore();

    const [groupsOpen, setGroupsOpen] = useState(true);
    const [dmsOpen, setDmsOpen] = useState(true);

    const all = getFilteredConversations();
    const groups = all.filter((c) => c.type === "group");
    const dms = all.filter((c) => c.type === "direct");

    return (
        <div className="flex flex-col h-full bg-slate-900/80 border-r border-white/5">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-white font-semibold text-lg tracking-tight">Messages</h2>
                    <button
                        onClick={onNewDM}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="New direct message"
                    >
                        <MessageCircle size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                {/* Groups */}
                <div>
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <button
                            onClick={() => setGroupsOpen((v) => !v)}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors"
                        >
                            {groupsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <Hash size={11} />
                            Groups ({groups.length})
                        </button>
                        {currentUserRole === "admin" && (
                            <button
                                onClick={onNewGroup}
                                className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                                title="Create group"
                            >
                                <Plus size={13} />
                            </button>
                        )}
                    </div>

                    {groupsOpen && (
                        <div className="space-y-0.5">
                            {groups.length === 0 && (
                                <p className="text-xs text-slate-600 px-3 py-2 italic">No group chats yet</p>
                            )}
                            {groups.map((conv) => (
                                <ConversationItem
                                    key={conv._id}
                                    conv={conv}
                                    currentUserId={currentUserId}
                                    isActive={activeConversationId === conv._id}
                                    onSelect={() => setActiveConversation(conv._id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="h-px bg-white/5 mx-2 my-2" />

                {/* DMs */}
                <div>
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                        <button
                            onClick={() => setDmsOpen((v) => !v)}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors"
                        >
                            {dmsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <Users size={11} />
                            Direct Messages ({dms.length})
                        </button>
                        <button
                            onClick={onNewDM}
                            className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                            title="New DM"
                        >
                            <Plus size={13} />
                        </button>
                    </div>

                    {dmsOpen && (
                        <div className="space-y-0.5">
                            {dms.length === 0 && (
                                <p className="text-xs text-slate-600 px-3 py-2 italic">No direct messages yet</p>
                            )}
                            {dms.map((conv) => (
                                <ConversationItem
                                    key={conv._id}
                                    conv={conv}
                                    currentUserId={currentUserId}
                                    isActive={activeConversationId === conv._id}
                                    onSelect={() => setActiveConversation(conv._id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}