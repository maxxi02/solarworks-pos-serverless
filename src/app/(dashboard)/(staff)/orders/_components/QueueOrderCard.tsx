"use client";

import { useDraggable } from "@dnd-kit/core";
import { MessageSquare, Clock, Utensils, Coffee, Car, User } from "lucide-react";
import { CustomerOrder } from "@/types/order.type";

interface QueueOrderCardProps {
    order: CustomerOrder;
    isDragging?: boolean;
    onOpenChat?: (order: CustomerOrder) => void;
}

const qrTypeBadge: Record<string, { icon: typeof Utensils; label: string; color: string }> = {
    "dine-in": { icon: Utensils, label: "Dine In", color: "text-blue-400 bg-blue-500/10" },
    "walk-in": { icon: User, label: "Walk In", color: "text-emerald-400 bg-emerald-500/10" },
    "drive-thru": { icon: Car, label: "Drive Thru", color: "text-orange-400 bg-orange-500/10" },
};

function getElapsedTime(timestamp: Date | string): string {
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
}

export function QueueOrderCard({ order, isDragging, onOpenChat }: QueueOrderCardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: order.orderId,
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : undefined;

    const badge = qrTypeBadge[order.qrType || "dine-in"];
    const BadgeIcon = badge?.icon || Utensils;

    const itemsSummary = order.items
        .slice(0, 3)
        .map((item) => `${item.quantity}x ${item.name}`)
        .join(", ");
    const moreItems = order.items.length > 3 ? ` +${order.items.length - 3} more` : "";

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all ${isDragging
                ? "bg-card border-primary shadow-xl shadow-primary/10 opacity-90 scale-105"
                : "bg-background border-border hover:border-primary/30 hover:shadow-sm"
                }`}
        >
            {/* Top row: Order # + Type badge */}
            <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-foreground text-sm">
                    {order.orderNumber || order.orderId.slice(0, 8)}
                </span>
                <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge?.color || ""}`}
                >
                    <BadgeIcon className="w-3 h-3" />
                    {badge?.label || "Order"}
                </span>
            </div>

            {/* Customer name + table */}
            <p className="text-xs text-muted-foreground mb-1.5">
                <span className="font-medium text-foreground">{order.customerName}</span>
                {order.tableNumber && (
                    <span className="ml-1.5 text-muted-foreground">• Table {order.tableNumber}</span>
                )}
            </p>

            {/* Items summary */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {itemsSummary}{moreItems}
            </p>

            {/* Note */}
            {order.orderNote && (
                <p className="text-xs text-amber-400/80 italic mb-2 line-clamp-1">
                    &quot;{order.orderNote}&quot;
                </p>
            )}

            {/* Footer: Time + Total + Chat */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                    <Clock className="w-3 h-3" />
                    {getElapsedTime(order.createdAt || order.timestamp)}
                </div>

                <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">
                        ₱{order.total?.toFixed(0)}
                    </span>

                    {(order.sessionId || order.tableNumber) && onOpenChat && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenChat(order);
                            }}
                            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                            title="Chat with customer"
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
