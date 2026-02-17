"use client";

import { useState, useEffect } from "react";
import { X, Search, Check, Loader2, Users, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserOption {
    id: string;
    name: string;
    image?: string;
    role: string;
}

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (conversationId: string) => void;
    currentUserId: string;
}

export function CreateGroupModal({ isOpen, onClose, onCreated, currentUserId }: CreateGroupModalProps) {
    const [step, setStep] = useState<"details" | "members">("details");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<UserOption[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setIsLoading(true);
        fetch("/api/users")
            .then((r) => r.json())
            .then((data) => setUsers(data.users ?? data))
            .catch(() => setError("Failed to load users"))
            .finally(() => setIsLoading(false));
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setStep("details");
            setName("");
            setDescription("");
            setSelectedIds(new Set());
            setError(null);
            setSearch("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filtered = users.filter(
        (u) =>
            u.id !== currentUserId &&
            u.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggleUser = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleCreate = async () => {
        if (!name.trim()) { setError("Group name is required"); return; }
        if (selectedIds.size === 0) { setError("Select at least one member"); return; }
        setIsCreating(true);
        setError(null);

        try {
            const res = await fetch("/api/conversations/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    participantIds: [...selectedIds],
                }),
            });

            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error ?? "Failed to create group");
            }

            const data = await res.json();
            onCreated(data._id);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create group");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                            <Hash size={16} className="text-indigo-400" />
                        </div>
                        <h2 className="text-white font-semibold">Create Group Chat</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Step tabs */}
                <div className="flex border-b border-white/5">
                    {(["details", "members"] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStep(s)}
                            className={cn(
                                "flex-1 py-3 text-sm font-medium capitalize transition-colors",
                                step === s
                                    ? "text-indigo-400 border-b-2 border-indigo-500"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            {s === "details" ? "Group Details" : `Members (${selectedIds.size})`}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400 mb-4">
                            {error}
                        </div>
                    )}

                    {step === "details" ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                    Group Name *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Engineering Team"
                                    maxLength={60}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                    Description (optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What's this group about?"
                                    rows={3}
                                    maxLength={200}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none"
                                />
                            </div>
                            <button
                                onClick={() => setStep("members")}
                                disabled={!name.trim()}
                                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
                            >
                                Next: Add Members
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Search */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search members..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>

                            {/* User list */}
                            <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                                {isLoading && (
                                    <div className="flex justify-center py-6">
                                        <Loader2 size={18} className="text-slate-500 animate-spin" />
                                    </div>
                                )}
                                {!isLoading && filtered.length === 0 && (
                                    <p className="text-center text-slate-500 text-sm py-6">No users found</p>
                                )}
                                {filtered.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => toggleUser(u.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                                            selectedIds.has(u.id)
                                                ? "bg-indigo-500/15 border border-indigo-500/30"
                                                : "hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        {u.image ? (
                                            <img
                                                src={u.image}
                                                alt={u.name}
                                                className="w-8 h-8 rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                                style={{
                                                    background: `hsl(${u.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360},55%,40%)`,
                                                }}
                                            >
                                                {u.name.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-200 font-medium truncate">{u.name}</p>
                                            <p className="text-xs text-slate-500 capitalize">{u.role}</p>
                                        </div>
                                        {selectedIds.has(u.id) && (
                                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Create button */}
                            <button
                                onClick={handleCreate}
                                disabled={isCreating || selectedIds.size === 0}
                                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        Creating...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Users size={16} />
                                        Create Group ({selectedIds.size} selected)
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}