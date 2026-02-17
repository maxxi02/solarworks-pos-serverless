"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2, MessageCircle } from "lucide-react";

interface UserOption {
    id: string;
    name: string;
    image?: string;
    role: string;
}

interface NewDMModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (userId: string, userName: string, userAvatar?: string) => void;
    currentUserId: string;
}

export function NewDMModal({ isOpen, onClose, onSelectUser, currentUserId }: NewDMModalProps) {
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<UserOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) { setSearch(""); return; }
        setIsLoading(true);
        fetch("/api/users")
            .then((r) => r.json())
            .then((data) => setUsers(data.users ?? data))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [isOpen]);

    if (!isOpen) return null;

    const filtered = users.filter(
        (u) => u.id !== currentUserId && u.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <MessageCircle size={16} className="text-indigo-400" />
                        <h2 className="text-white font-semibold">New Direct Message</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                        {isLoading && (
                            <div className="flex justify-center py-8">
                                <Loader2 size={18} className="text-slate-500 animate-spin" />
                            </div>
                        )}
                        {!isLoading && filtered.length === 0 && (
                            <p className="text-center text-slate-500 text-sm py-8">No users found</p>
                        )}
                        {filtered.map((u) => (
                            <button
                                key={u.id}
                                onClick={() => {
                                    onSelectUser(u.id, u.name, u.image);
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                            >
                                {u.image ? (
                                    <img src={u.image} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                                        style={{
                                            background: `hsl(${u.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360},55%,40%)`,
                                        }}
                                    >
                                        {u.name.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-slate-200 font-medium">{u.name}</p>
                                    <p className="text-xs text-slate-500 capitalize">{u.role}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}