"use client";

import { useState, useEffect, useCallback } from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCorners,
    useSensor,
    useSensors,
    PointerSensor,
} from "@dnd-kit/core";
import { toast } from "react-hot-toast";
import { QueueColumn } from "./QueueColumn";
import { QueueOrderCard } from "./QueueOrderCard";
import { CustomerOrder, QueueStatus } from "@/types/order.type";
import { RefreshCw } from "lucide-react";

const QUEUE_COLUMNS: { id: QueueStatus; label: string; color: string }[] = [
    { id: "paid", label: "Paid", color: "bg-blue-500" },
    { id: "preparing", label: "Preparing", color: "bg-amber-500" },
    { id: "ready", label: "Ready", color: "bg-emerald-500" },
    { id: "served", label: "Served", color: "bg-purple-500" },
];

interface QueueBoardProps {
    onOpenChat?: (order: CustomerOrder) => void;
}

export function QueueBoard({ onOpenChat }: QueueBoardProps) {
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeOrder, setActiveOrder] = useState<CustomerOrder | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
    );

    const fetchOrders = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/orders/queue?statuses=paid,preparing,ready,served");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setOrders(data);
        } catch {
            toast.error("Failed to load queue");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        // Poll every 10s for real-time feel
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    const updateOrderStatus = async (orderId: string, newStatus: QueueStatus) => {
        try {
            const res = await fetch("/api/orders/queue", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, queueStatus: newStatus }),
            });

            if (!res.ok) throw new Error("Failed to update");

            const updatedOrder = await res.json();
            setOrders((prev) =>
                prev.map((o) =>
                    o.orderId === orderId ? { ...o, ...updatedOrder, queueStatus: newStatus } : o,
                ),
            );

            toast.success(`Order moved to ${newStatus}`);
        } catch {
            toast.error("Failed to update order status");
            fetchOrders(); // Refresh on error
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        const order = orders.find((o) => o.orderId === event.active.id);
        setActiveOrder(order || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveOrder(null);

        const { active, over } = event;
        if (!over) return;

        const orderId = active.id as string;
        const newStatus = over.id as QueueStatus;

        const order = orders.find((o) => o.orderId === orderId);
        if (!order || order.queueStatus === newStatus) return;

        // Optimistic update
        setOrders((prev) =>
            prev.map((o) =>
                o.orderId === orderId ? { ...o, queueStatus: newStatus } : o,
            ),
        );

        updateOrderStatus(orderId, newStatus);
    };

    const getOrdersByStatus = (status: QueueStatus) =>
        orders.filter((o) => o.queueStatus === status);

    if (isLoading) {
        return (
            <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-xl bg-card border border-border p-4 animate-pulse">
                        <div className="h-6 bg-muted rounded mb-4" />
                        <div className="space-y-3">
                            <div className="h-24 bg-muted rounded-lg" />
                            <div className="h-24 bg-muted rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Order Queue</h2>
                    <p className="text-sm text-muted-foreground">
                        Drag orders between columns to update status
                    </p>
                </div>
                <button
                    onClick={fetchOrders}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:bg-accent transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                </button>
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-4 gap-4 min-h-[600px]">
                    {QUEUE_COLUMNS.map((col) => (
                        <QueueColumn
                            key={col.id}
                            id={col.id}
                            label={col.label}
                            color={col.color}
                            orders={getOrdersByStatus(col.id)}
                            onOpenChat={onOpenChat}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeOrder ? (
                        <QueueOrderCard order={activeOrder} isDragging />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
