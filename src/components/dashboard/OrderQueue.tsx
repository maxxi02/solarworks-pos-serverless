'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/provider/socket-provider";
import { CustomerOrder, QueueStatus } from "@/types/order.type";
import { Utensils, Clock, RefreshCw, ChefHat, UtensilsCrossed } from 'lucide-react';

function getElapsed(timestamp: Date | string | undefined): string {
    if (!timestamp) return "—";
    const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
    pending_payment: {
        label: "Awaiting Payment",
        dot: "bg-yellow-400 animate-pulse",
        badge: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    },
    queueing: {
        label: "Wait List",
        dot: "bg-amber-500",
        badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    },
    preparing: {
        label: "Preparing",
        dot: "bg-orange-500 animate-pulse",
        badge: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    },
    serving: {
        label: "Serving",
        dot: "bg-emerald-500",
        badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    },
};

const ACTIVE_STATUSES = ["queueing", "preparing", "serving"];

export function OrderQueue() {
    const { onQueueUpdated, offQueueUpdated, onNewCustomerOrder, offNewCustomerOrder } = useSocket();
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrders = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/orders/queue?statuses=queueing,preparing,serving");
            if (!res.ok) throw new Error();
            const data: CustomerOrder[] = await res.json();
            setOrders(data.filter((o) => ACTIVE_STATUSES.includes(o.queueStatus || "")));
        } catch {
            // silently fail — dashboard widget
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        const handleQueueUpdate = (data: { orderId: string; queueStatus: string; order: CustomerOrder }) => {
            setOrders((prev) => {
                const exists = prev.find((o) => o.orderId === data.orderId);
                if (data.queueStatus === "done" || data.queueStatus === "cancelled") {
                    return prev.filter((o) => o.orderId !== data.orderId);
                }
                if (!ACTIVE_STATUSES.includes(data.queueStatus)) return prev;
                if (exists) {
                    return prev.map((o) =>
                        o.orderId === data.orderId
                            ? { ...o, ...data.order, queueStatus: data.queueStatus as QueueStatus }
                            : o
                    );
                }
                return [data.order, ...prev];
            });
        };

        const handleNewOrder = (order: CustomerOrder) => {
            if (!ACTIVE_STATUSES.includes(order.queueStatus || "")) return;
            setOrders((prev) => [order, ...prev.filter((o) => o.orderId !== order.orderId)]);
        };

        onQueueUpdated(handleQueueUpdate);
        onNewCustomerOrder(handleNewOrder);
        return () => {
            offQueueUpdated(handleQueueUpdate);
            offNewCustomerOrder(handleNewOrder);
        };
    }, [onQueueUpdated, offQueueUpdated, onNewCustomerOrder, offNewCustomerOrder]);

    const visible = orders.slice(0, 6);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                    {!isLoading && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                            {orders.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={fetchOrders}
                    className="p-1 rounded-md text-muted-foreground hover:bg-accent transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                        <ChefHat className="h-10 w-10 mb-2" />
                        <p className="text-sm">No active orders</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {visible.map((order) => {
                            const cfg = STATUS_CONFIG[order.queueStatus || "queueing"];
                            return (
                                <div
                                    key={order.orderId}
                                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 gap-3"
                                >
                                    {/* Left */}
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-xs text-primary">
                                                {order.orderNumber || `#${order.orderId.slice(-4).toUpperCase()}`}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wide py-0 h-4">
                                                {order.tableNumber ? `T${order.tableNumber}` : order.orderType || "takeaway"}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-foreground truncate font-medium">
                                            {order.customerName}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate">
                                            {order.items.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                                            {order.items.length > 2 && ` +${order.items.length - 2}`}
                                        </p>
                                    </div>

                                    {/* Right */}
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg?.badge}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot}`} />
                                            {cfg?.label || order.queueStatus}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                            <Clock className="w-2.5 h-2.5" />
                                            {getElapsed(order.createdAt || order.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {orders.length > 6 && (
                            <p className="text-center text-[11px] text-muted-foreground pt-1">
                                +{orders.length - 6} more · <a href="/dashboard/orders" className="underline underline-offset-2">View all</a>
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
