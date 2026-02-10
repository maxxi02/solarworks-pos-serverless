import React from "react";
import { formatDistanceToNow } from "date-fns";

interface OnlineStatusBadgeProps {
    isOnline?: boolean;
    lastActive?: Date | null;
}

export function OnlineStatusBadge({ isOnline, lastActive }: OnlineStatusBadgeProps) {
    const online = isOnline ?? false;

    return (
        <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
                {online && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                )}
                <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? "bg-green-500" : "bg-gray-400"
                        }`}
                />
            </span>
            <div className="flex flex-col">
                <span
                    className={`text-sm font-medium ${online ? "text-green-700" : "text-muted-foreground"
                        }`}
                >
                    {online ? "Online" : "Offline"}
                </span>
                {lastActive && !online && (
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(lastActive), { addSuffix: true })}
                    </span>
                )}
            </div>
        </div>
    );
}