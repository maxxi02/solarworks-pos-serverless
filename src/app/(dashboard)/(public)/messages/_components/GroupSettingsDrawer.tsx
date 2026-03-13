"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Settings,
    Search,
    Camera,
    Check,
    Loader2,
    UserPlus,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ConversationWithDetails } from "@/types/messaging.types";

interface GroupSettingsDrawerProps {
    conversation: ConversationWithDetails;
    currentUserId: string;
    onUpdated: () => void;
}

interface UserSearchResult {
    id: string;
    name: string;
    image?: string;
    email: string;
    isOnline: boolean;
    role: string;
}

export function GroupSettingsDrawer({
    conversation,
    currentUserId,
    onUpdated,
}: GroupSettingsDrawerProps) {
    const [open, setOpen] = useState(false);
    const [groupName, setGroupName] = useState(conversation.groupName || "");
    const [savingName, setSavingName] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Add members
    const [memberSearch, setMemberSearch] = useState("");
    const [memberResults, setMemberResults] = useState<UserSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

    const isAdmin = (conversation.adminIds || []).includes(currentUserId);
    const members = conversation.members || [];

    const handleSearchChange = async (val: string) => {
        setMemberSearch(val);
        if (val.length < 2) { setMemberResults([]); return; }

        clearTimeout(searchTimer.current!);
        searchTimer.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(val)}`);
                const data = await res.json() as { users: UserSearchResult[] };
                const currentIds = new Set((conversation.participants || []) as string[]);
                setMemberResults((data.users || []).filter((u) => !currentIds.has(u.id)));
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const handleAddMember = async (user: UserSearchResult) => {
        setAddingIds((prev) => new Set([...prev, user.id]));
        try {
            const res = await fetch("/api/conversations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId: conversation._id as string, addMemberIds: [user.id] }),
            });
            if (!res.ok) throw new Error();
            toast.success(`${user.name} added to group`);
            setMemberSearch("");
            setMemberResults([]);
            onUpdated();
        } catch {
            toast.error("Failed to add member");
        } finally {
            setAddingIds((prev) => { const s = new Set(prev); s.delete(user.id); return s; });
        }
    };

    const handleSaveName = async () => {
        if (!groupName.trim() || groupName.trim() === conversation.groupName) return;
        setSavingName(true);
        try {
            const res = await fetch("/api/conversations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId: conversation._id as string, groupName: groupName.trim() }),
            });
            if (!res.ok) throw new Error();
            toast.success("Group name updated");
            onUpdated();
        } catch {
            toast.error("Failed to update group name");
        } finally {
            setSavingName(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch("/api/messages/upload", { method: "POST", body: formData });
            if (!uploadRes.ok) throw new Error();
            const { url } = await uploadRes.json() as { url: string };

            const res = await fetch("/api/conversations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId: conversation._id as string, groupImage: url }),
            });
            if (!res.ok) throw new Error();
            toast.success("Group image updated");
            onUpdated();
        } catch {
            toast.error("Failed to update group image");
        } finally {
            setUploadingImage(false);
        }
    };

    return (
        <Drawer open={open} onOpenChange={setOpen} direction="right">
            <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Group settings">
                    <Settings className="h-4 w-4" />
                </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-screen flex flex-col">
                <DrawerHeader className="border-b pb-4">
                    <DrawerTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Group Settings
                    </DrawerTitle>
                </DrawerHeader>

                <ScrollArea className="flex-1">
                    <div className="p-5 space-y-6">
                        {/* ── Group Avatar ── */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <Avatar className="h-20 w-20 ring-2 ring-border">
                                    <AvatarImage src={conversation.groupImage ?? undefined} />
                                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                        {(conversation.groupName || "G").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                {isAdmin && (
                                    <label
                                        className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
                                        title="Change group image"
                                    >
                                        {uploadingImage
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <Camera className="h-3.5 w-3.5" />}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                                        />
                                    </label>
                                )}
                            </div>
                            <p className="font-semibold text-base">{conversation.groupName}</p>
                            <p className="text-xs text-muted-foreground">{members.length} members</p>
                        </div>

                        <Separator />

                        {/* ── Rename Group (admin only) ── */}
                        {isAdmin && (
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group Name</p>
                                <div className="flex gap-2">
                                    <Input
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="Group name..."
                                        onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                                    />
                                    <Button
                                        size="icon"
                                        onClick={handleSaveName}
                                        disabled={savingName || !groupName.trim() || groupName.trim() === conversation.groupName}
                                    >
                                        {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── Add Members ── */}
                        <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Members</p>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    className="pl-8 h-8 text-sm"
                                    placeholder="Search people..."
                                    value={memberSearch}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                            </div>
                            {searching && (
                                <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                            )}
                            {memberResults.length > 0 && (
                                <div className="rounded-lg border overflow-hidden divide-y divide-border">
                                    {memberResults.map((u) => (
                                        <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-accent/50 transition-colors">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={u.image} />
                                                <AvatarFallback className="text-xs">{u.name.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{u.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs px-2"
                                                onClick={() => handleAddMember(u)}
                                                disabled={addingIds.has(u.id)}
                                            >
                                                {addingIds.has(u.id)
                                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                                    : <><UserPlus className="h-3 w-3 mr-1" />Add</>}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* ── Members List ── */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Members</p>
                            <div className="space-y-1">
                                {members.map((m) => {
                                    const isCurrentUser = m.userId === currentUserId;
                                    const isMemberAdmin = (conversation.adminIds || []).includes(m.userId);
                                    return (
                                        <div key={m.userId} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/40 transition-colors">
                                            <div className="relative shrink-0">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={m.image} />
                                                    <AvatarFallback className="text-xs">{(m.name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                {m.isOnline ? (
                                                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                                                ) : null}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-sm font-medium truncate", isCurrentUser && "text-primary")}>
                                                    {m.name || "Unknown"}{isCurrentUser && " (You)"}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {m.isOnline
                                                        ? "Online"
                                                        : m.lastSeen
                                                            ? `Last seen ${formatDistanceToNow(new Date(m.lastSeen), { addSuffix: true })}`
                                                            : "Offline"}
                                                </p>
                                            </div>
                                            {isMemberAdmin && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Admin</Badge>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DrawerContent>
        </Drawer>
    );
}
