"use client";

import { useDroppable } from "@dnd-kit/core";
import { QueueOrderCard } from "./QueueOrderCard";
import { CustomerOrder, QueueStatus } from "@/types/order.type";

interface QueueColumnProps {
    id: QueueStatus;
    label: string;
    color: string;
    orders: CustomerOrder[];
    onOpenChat?: (order: CustomerOrder) => void;
}

export function QueueColumn({ id, label, color, orders, onOpenChat }: QueueColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`rounded-xl border transition-colors ${isOver
                ? "border-primary bg-primary/5"
                : "border-border bg-card/50"
                }`}
        >
            {/* Column Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <h3 className="font-semibold text-foreground text-sm">{label}</h3>
                <span className="ml-auto text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {orders.length}
                </span>
            </div>

            {/* Orders */}
            <div className="p-3 space-y-3 min-h-[200px]">
                {orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                        No orders
                    </div>
                ) : (
                    orders.map((order) => (
                        <QueueOrderCard
                            key={order.orderId}
                            order={order}
                            onOpenChat={onOpenChat}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
