"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, MessageSquarePlus } from "lucide-react";
import type { ChatUser } from "@/types/chat.type";

interface UserPickerProps {
    users: ChatUser[];
    isLoading: boolean;
    currentUserId: string;
    onSelect: (user: ChatUser) => void;
    onClose: () => void;
}

export function UserPicker({
    users,
    isLoading,
    currentUserId,
    onSelect,
    onClose,
}: UserPickerProps) {
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        return users.filter(
            (u) =>
                u.id !== currentUserId &&
                (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        );
    }, [users, query, currentUserId]);

    return (
        <div className="absolute inset-0 z-10 flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
                <MessageSquarePlus className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="font-semibold flex-1">New Message</span>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Search */}
            <div className="p-3 border-b">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        autoFocus
                        placeholder="Search by name or email..."
                        className="pl-9"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* User list */}
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                        Loading users...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                        {query ? "No users match your search" : "No users found"}
                    </div>
                ) : (
                    <div className="py-1">
                        {filtered.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => {
                                    onSelect(user);
                                    onClose();
                                }}
                                className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                            >
                                <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarImage src={user.image} alt={user.name} />
                                    <AvatarFallback className="text-sm">
                                        {user.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {user.email}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}