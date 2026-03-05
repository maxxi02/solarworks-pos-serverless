"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { RefreshCw, ChefHat, UtensilsCrossed, Clock, Filter } from "lucide-react";
import { CustomerOrder, QueueStatus } from "@/types/order.type";
import { OrderDetailModal } from "./OrderDetailModal";
import { useSocket } from "@/provider/socket-provider";
import { Badge } from "@/components/ui/badge";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getElapsed(timestamp: Date | string | undefined): string {
    if (!timestamp) return "—";
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function formatTime(d: Date | string | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
    pending_payment: {
        label: "Awaiting Payment",
        dot: "bg-yellow-400 animate-pulse",
        badge: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    },
    queueing: {
        label: "Queueing",
        dot: "bg-sky-500 animate-pulse",
        badge: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
    },
    serving: {
        label: "Serving",
        dot: "bg-emerald-500",
        badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    },
    done: {
        label: "Done",
        dot: "bg-purple-400",
        badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    },
};

// ─── Header cell ────────────────────────────────────────────────────────────

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <th
            className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
        >
            {children}
        </th>
    );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface QueueBoardProps {
    onOpenChat?: (order: CustomerOrder) => void;
}

type FilterType = "all" | "queueing" | "serving";

export function QueueBoard({ onOpenChat }: QueueBoardProps) {
    const { onQueueUpdated, offQueueUpdated, emitOrderQueueUpdate } = useSocket();

    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
    const [filter, setFilter] = useState<FilterType>("all");
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

    // ─── Fetch on mount ──────────────────────────────────────────────
    const fetchOrders = useCallback(async () => {
        try {
            setIsLoading(true);
            // Include pending_payment so customer orders show immediately
            const res = await fetch("/api/orders/queue?statuses=pending_payment,queueing,serving");
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
    }, [fetchOrders]);

    // ─── Real-time updates via Socket.IO ─────────────────────────────
    useEffect(() => {
        const handleQueueUpdate = (data: { orderId: string; queueStatus: string; order: CustomerOrder }) => {
            setOrders((prev) => {
                const exists = prev.find((o) => o.orderId === data.orderId);
                if (exists) {
                    return prev.map((o) =>
                        o.orderId === data.orderId
                            ? { ...o, ...data.order, queueStatus: data.queueStatus as QueueStatus }
                            : o
                    );
                }
                // New order arrived
                return [data.order, ...prev];
            });
        };

        onQueueUpdated(handleQueueUpdate);
        return () => offQueueUpdated(handleQueueUpdate);
    }, [onQueueUpdated, offQueueUpdated]);

    // ─── Status update ───────────────────────────────────────────────
    const updateStatus = async (e: React.MouseEvent, orderId: string, newStatus: QueueStatus) => {
        e.stopPropagation();
        if (updatingIds.has(orderId)) return;

        setUpdatingIds((s) => new Set(s).add(orderId));

        // Optimistic update
        setOrders((prev) =>
            prev.map((o) => (o.orderId === orderId ? { ...o, queueStatus: newStatus } : o))
        );

        try {
            // Emit via socket (server will broadcast back to all POS + notify customer)
            emitOrderQueueUpdate(orderId, newStatus);

            // Also PATCH REST for persistence
            await fetch("/api/orders/queue", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, queueStatus: newStatus }),
            });

            toast.success(`Order marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        } catch {
            toast.error("Failed to update status");
            fetchOrders();
        } finally {
            setUpdatingIds((s) => {
                const next = new Set(s);
                next.delete(orderId);
                return next;
            });
        }
    };

    // ─── Filtered rows ───────────────────────────────────────────────
    const ACTIVE_STATUSES = ["pending_payment", "queueing", "serving"];

    const visibleOrders = orders.filter((o) => {
        if (filter === "all") return ACTIVE_STATUSES.includes(o.queueStatus || "");
        return o.queueStatus === filter;
    });

    const counts = {
        all: orders.filter((o) => ACTIVE_STATUSES.includes(o.queueStatus || "")).length,
        queueing: orders.filter((o) => o.queueStatus === "queueing").length,
        serving: orders.filter((o) => o.queueStatus === "serving").length,
    };

    // ─── Skeleton ────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-10 w-64 bg-muted rounded animate-pulse" />
                <div className="rounded-xl border border-border overflow-hidden">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted/40 border-b border-border animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    // ─── Render ──────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Order Queue</h2>
                    <p className="text-sm text-muted-foreground">
                        {counts.all} active order{counts.all !== 1 ? "s" : ""} · Live updates via Socket.IO
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchOrders}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:bg-accent transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border w-fit">
                {(["all", "queueing", "serving"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filter === f
                            ? "bg-card text-foreground shadow-sm border border-border"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {f === "serving" && <UtensilsCrossed className="w-3.5 h-3.5" />}
                        {f === "all" && <Filter className="w-3.5 h-3.5" />}
                        {f === "queueing" && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />}
                        {f === "all" ? "All Active" : f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${f === "queueing" && (counts.queueing ?? 0) > 0
                            ? "bg-sky-500/20 text-sky-400"
                            : "bg-muted text-muted-foreground"
                            }`}>
                            {counts[f] ?? counts.all}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead className="bg-muted/30 border-b border-border">
                            <tr>
                                <Th>Order #</Th>
                                <Th>Customer</Th>
                                <Th>Table</Th>
                                <Th>Type</Th>
                                <Th>Items</Th>
                                <Th>Status</Th>
                                <Th>Time</Th>
                                <Th className="text-right">Action</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {visibleOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-muted-foreground text-sm">
                                        <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        No orders in this view
                                    </td>
                                </tr>
                            ) : (
                                visibleOrders.map((order) => {
                                    const cfg = STATUS_CONFIG[order.queueStatus || "paid"];
                                    const isUpdating = updatingIds.has(order.orderId);

                                    // Truncated items
                                    const itemsText = order.items
                                        .slice(0, 2)
                                        .map((i) => `${i.quantity}× ${i.name}`)
                                        .join(", ");
                                    const moreItems = order.items.length > 2 ? ` +${order.items.length - 2}` : "";

                                    // Relevant timestamp for the current state
                                    const stateTimestamp =
                                        order.queueStatus === "serving"
                                            ? order.servingAt
                                            : order.queueingAt ?? order.paidAt;

                                    return (
                                        <tr
                                            key={order.orderId}
                                            onClick={() => setSelectedOrder(order)}
                                            className="hover:bg-muted/20 cursor-pointer transition-colors group"
                                        >
                                            {/* Order # */}
                                            <td className="px-4 py-3 w-24">
                                                <span className="font-mono font-bold text-sm text-primary">
                                                    {order.orderNumber || `#${order.orderId.slice(-4).toUpperCase()}`}
                                                </span>
                                            </td>

                                            {/* Customer */}
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-sm text-foreground leading-tight">
                                                    {order.customerName}
                                                </p>
                                            </td>

                                            {/* Table */}
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-muted-foreground">
                                                    {order.tableNumber || "—"}
                                                </p>
                                            </td>

                                            {/* Order Type */}
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                                    {order.orderType || "Dine-in"}
                                                </Badge>
                                            </td>

                                            {/* Items */}
                                            <td className="px-4 py-3 max-w-[200px]">
                                                <p className="text-sm text-foreground truncate">
                                                    {itemsText}
                                                    {moreItems && (
                                                        <span className="text-muted-foreground">{moreItems}</span>
                                                    )}
                                                </p>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg?.badge}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot}`} />
                                                    {cfg?.label || order.queueStatus}
                                                </span>
                                            </td>

                                            {/* Time */}
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                                        <Clock className="w-3 h-3" />
                                                        {getElapsed(order.createdAt || order.timestamp)}
                                                    </span>
                                                    {stateTimestamp && (
                                                        <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                                                            Since {formatTime(stateTimestamp)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Action */}
                                            <td className="px-4 py-3 text-right">
                                                <div
                                                    className="flex items-center justify-end gap-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {(order.queueStatus === "pending_payment" || order.queueStatus === "queueing") && (
                                                        <button
                                                            onClick={(e) => updateStatus(e, order.orderId, "serving")}
                                                            disabled={isUpdating}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-colors disabled:opacity-50"
                                                        >
                                                            <UtensilsCrossed className="w-3 h-3" />
                                                            {isUpdating ? "..." : "Start Serving"}
                                                        </button>
                                                    )}
                                                    {order.queueStatus === "serving" && (
                                                        <button
                                                            onClick={(e) => updateStatus(e, order.orderId, "done")}
                                                            disabled={isUpdating}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-semibold border border-purple-500/20 transition-colors disabled:opacity-50"
                                                        >
                                                            ✓ {isUpdating ? "..." : "Mark Done"}
                                                        </button>
                                                    )}
                                                    {order.queueStatus === "done" && (
                                                        <span className="text-xs text-muted-foreground">✓ Done</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>

                        {/* Footer total row */}
                        {visibleOrders.length > 0 && (
                            <tfoot className="border-t border-border bg-muted/20">
                                <tr>
                                    <td colSpan={7} className="px-4 py-3 text-sm font-semibold text-foreground">
                                        Total
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-primary">
                                        ₱{visibleOrders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(0)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Order detail modal */}
            <OrderDetailModal
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />
        </div>
    );
}
