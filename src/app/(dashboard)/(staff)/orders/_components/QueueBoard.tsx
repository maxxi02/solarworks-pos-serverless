"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  Printer,
  RefreshCw,
  ChefHat,
  UtensilsCrossed,
  Clock,
  Filter,
} from "lucide-react";
import { CustomerOrder, QueueStatus } from "@/types/order.type";
import { OrderDetailModal } from "./OrderDetailModal";
import { useSocket } from "@/provider/socket-provider";
import { Badge } from "@/components/ui/badge";
import { SavedOrder, CartItem } from "./pos.types";

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
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  pending_payment: {
    label: "Awaiting Payment",
    dot: "bg-yellow-400 animate-pulse",
    badge: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  },
  paid: {
    label: "Wait List (Paid)",
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
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
  done: {
    label: "Done",
    dot: "bg-purple-400",
    badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },
};

// ─── Header cell ────────────────────────────────────────────────────────────

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
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
  onReprintReceipt?: (order: SavedOrder) => void;
  onPrintKitchenSlip?: (order: CustomerOrder) => void;
}

type FilterType = "all" | "queueing" | "preparing" | "serving";

export function QueueBoard({ onOpenChat, onReprintReceipt, onPrintKitchenSlip }: QueueBoardProps) {
  const { onQueueUpdated, offQueueUpdated, emitOrderQueueUpdate } = useSocket();

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(
    null,
  );
  const [filter, setFilter] = useState<FilterType>("all");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // ─── Fetch on mount ──────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        "/api/orders/queue?statuses=pending_payment,queueing,preparing,serving",
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data: CustomerOrder[] = await res.json();

      // We only want pending_payment if it's a dine-in (table) order
      const filtered = data.filter(
        (o) => o.queueStatus !== "pending_payment" || o.orderType === "dine-in",
      );

      setOrders(filtered);
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
    const handleQueueUpdate = (data: {
      orderId: string;
      queueStatus: string;
      order: CustomerOrder;
    }) => {
      // Ignore pending_payment for takeaway (wait until paid)
      if (
        data.queueStatus === "pending_payment" &&
        data.order?.orderType !== "dine-in"
      ) {
        return;
      }

      setOrders((prev) => {
        const exists = prev.find((o) => o.orderId === data.orderId);
        if (exists) {
          // If the order moved to "done" or "cancelled", remove it from the board
          if (data.queueStatus === "done" || data.queueStatus === "cancelled") {
            return prev.filter((o) => o.orderId !== data.orderId);
          }
          return prev.map((o) =>
            o.orderId === data.orderId
              ? {
                ...o,
                ...data.order,
                queueStatus: data.queueStatus as QueueStatus,
              }
              : o,
          );
        }
        // New paid order arrived (queueing) — add to top of list
        return [data.order, ...prev];
      });
    };

    onQueueUpdated(handleQueueUpdate);
    return () => offQueueUpdated(handleQueueUpdate);
  }, [onQueueUpdated, offQueueUpdated]);

  // ─── Status update ───────────────────────────────────────────────
  const updateStatus = async (
    e: React.MouseEvent,
    orderId: string,
    newStatus: QueueStatus,
  ) => {
    e.stopPropagation();
    if (updatingIds.has(orderId)) return;

    setUpdatingIds((s) => new Set(s).add(orderId));

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === orderId ? { ...o, queueStatus: newStatus } : o,
      ),
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

      // Kitchen Slip Printing logic: 
      // check if going to 'preparing' and if the callback onPrintKitchenSlip is provided
      if (newStatus === "preparing" && onPrintKitchenSlip) {
        const order = orders.find(o => o.orderId === orderId);
        if (order) {
          onPrintKitchenSlip(order);
        }
      }

      toast.success(
        `Order marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
      );
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

  // ─── Map to SavedOrder for printing ─────────────────────────────
  const mapToSavedOrder = (order: CustomerOrder): SavedOrder => {
    return {
      id: order.orderId,
      orderNumber: order.orderNumber || order.orderId.slice(-6).toUpperCase(),
      customerName: order.customerName,
      items: order.items.map((item) => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        menuType: item.menuType,
        ingredients: item.ingredients || [],
        available: true,
      })) as CartItem[],
      subtotal: order.subtotal,
      discountTotal: 0,
      total: order.total,
      paymentMethod: "gcash", // Default for web orders
      orderType: order.orderType || "takeaway",
      tableNumber: order.tableNumber,
      timestamp: order.timestamp ? new Date(order.timestamp) : new Date(),
      status: "completed",
      orderNote: order.orderNote,
      cashier: "Web Order",
    };
  };

  const handlePrint = (e: React.MouseEvent, order: CustomerOrder) => {
    e.stopPropagation();
    if (onReprintReceipt) {
      onReprintReceipt(mapToSavedOrder(order));
    }
  };

  // ─── Filtered rows ───────────────────────────────────────────────
  const ACTIVE_STATUSES = ["queueing", "preparing", "serving"];

  const visibleOrders = orders.filter((o) => {
    if (filter === "all") return ACTIVE_STATUSES.includes(o.queueStatus || "");
    return o.queueStatus === filter;
  });

  const counts = {
    all: orders.filter((o) => ACTIVE_STATUSES.includes(o.queueStatus || ""))
      .length,
    queueing: orders.filter((o) => o.queueStatus === "queueing").length,
    preparing: orders.filter((o) => o.queueStatus === "preparing").length,
    serving: orders.filter((o) => o.queueStatus === "serving").length,
  };

  // ─── Skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-muted rounded animate-pulse" />
        <div className="rounded-xl border border-border overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-muted/40 border-b border-border animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Order Queue</h2>
          <p className="text-sm text-muted-foreground">
            {counts.all} active order{counts.all !== 1 ? "s" : ""} · Live
            updates via Socket.IO
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
      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border w-fit min-w-full sm:min-w-0">
          {(["all", "queueing", "preparing", "serving"] as const).map((f) => (
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
              {f === "queueing" && (
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              )}
              {f === "all"
                ? "All Active"
                : f.charAt(0).toUpperCase() + f.slice(1)}
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${f === "queueing" && (counts.queueing ?? 0) > 0
                  ? "bg-sky-500/20 text-sky-400"
                  : "bg-muted text-muted-foreground"
                  }`}
              >
                {counts[f] ?? counts.all}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card">
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
                  <td
                    colSpan={8}
                    className="py-16 text-center text-muted-foreground text-sm"
                  >
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
                  const moreItems =
                    order.items.length > 2 ? ` +${order.items.length - 2}` : "";

                  // Relevant timestamp for the current state
                  const stateTimestamp =
                    order.queueStatus === "serving"
                      ? order.servingAt
                      : order.queueStatus === "preparing"
                        ? order.preparingAt
                        : (order.queueingAt ?? order.paidAt);

                  return (
                    <tr
                      key={order.orderId}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-muted/20 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 w-24">
                        <span className="font-mono font-bold text-sm text-primary">
                          {order.orderNumber ||
                            `#${order.orderId.slice(-4).toUpperCase()}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm text-foreground leading-tight">
                          {order.customerName}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                          {order.tableNumber || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wider"
                        >
                          {order.orderType || "Dine-in"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-sm text-foreground truncate">
                          {itemsText}
                          {moreItems && (
                            <span className="text-muted-foreground">
                              {moreItems}
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg?.badge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${cfg?.dot}`}
                          />
                          {cfg?.label || order.queueStatus}
                        </span>
                      </td>
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
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {onReprintReceipt && (
                            <button
                              onClick={(e) => handlePrint(e, order)}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
                              title="Print Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(order.queueStatus === "pending_payment" ||
                            order.queueStatus === "queueing") && (
                              <button
                                onClick={(e) =>
                                  updateStatus(e, order.orderId, "preparing")
                                }
                                disabled={isUpdating}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-semibold border border-orange-500/20 transition-colors disabled:opacity-50"
                              >
                                <ChefHat className="w-3 h-3" />
                                {isUpdating ? "..." : "Start Prep"}
                              </button>
                            )}
                          {order.queueStatus === "preparing" && (
                            <button
                              onClick={(e) =>
                                updateStatus(e, order.orderId, "serving")
                              }
                              disabled={isUpdating}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-colors disabled:opacity-50"
                            >
                              <UtensilsCrossed className="w-3 h-3" />
                              {isUpdating ? "..." : "Start Serving"}
                            </button>
                          )}
                          {order.queueStatus === "serving" && (
                            <button
                              onClick={(e) =>
                                updateStatus(e, order.orderId, "done")
                              }
                              disabled={isUpdating}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-semibold border border-purple-500/20 transition-colors disabled:opacity-50"
                            >
                              ✓ {isUpdating ? "..." : "Mark Done"}
                            </button>
                          )}
                          {order.queueStatus === "done" && (
                            <span className="text-xs text-muted-foreground">
                              ✓ Done
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {visibleOrders.length > 0 && (
              <tfoot className="border-t border-border bg-muted/20">
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-3 text-sm font-semibold text-foreground"
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-primary">
                    ₱
                    {visibleOrders
                      .reduce((sum, o) => sum + (o.total || 0), 0)
                      .toFixed(0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="md:hidden space-y-3">
        {visibleOrders.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
            <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No orders in this view</p>
          </div>
        ) : (
          visibleOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.queueStatus || "paid"];
            const isUpdating = updatingIds.has(order.orderId);
            const stateTimestamp =
              order.queueStatus === "serving"
                ? order.servingAt
                : order.queueStatus === "preparing"
                  ? order.preparingAt
                  : (order.queueingAt ?? order.paidAt);

            return (
              <div
                key={order.orderId}
                onClick={() => setSelectedOrder(order)}
                className="bg-card border border-border rounded-xl p-4 space-y-3 active:scale-[0.98] transition-all"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-primary">
                        {order.orderNumber ||
                          `#${order.orderId.slice(-4).toUpperCase()}`}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[9px] uppercase tracking-tight py-0 h-4"
                      >
                        {order.tableNumber
                          ? `Table ${order.tableNumber}`
                          : order.orderType || "Takeaway"}
                      </Badge>
                    </div>
                    <p className="font-bold text-foreground truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none">
                      {order.customerName}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg?.badge}`}
                  >
                    <span className={`w-1 h-1 rounded-full ${cfg?.dot}`} />
                    {cfg?.label || order.queueStatus}
                  </span>
                </div>

                {/* Items Summary */}
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                    <span className="text-primary font-bold mr-1">
                      {order.items.length} Items:
                    </span>
                    {order.items
                      .map((i) => `${i.quantity}× ${i.name}`)
                      .join(", ")}
                  </p>
                </div>

                {/* Meta & Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {getElapsed(order.createdAt || order.timestamp)}
                    </span>
                    {stateTimestamp && (
                      <span className="text-[9px] text-muted-foreground/60">
                        Since {formatTime(stateTimestamp)}
                      </span>
                    )}
                  </div>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2"
                  >
                    {onReprintReceipt && (
                      <button
                        onClick={(e) => handlePrint(e, order)}
                        className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(order.queueStatus === "pending_payment" ||
                      order.queueStatus === "queueing") && (
                        <button
                          onClick={(e) =>
                            updateStatus(e, order.orderId, "preparing")
                          }
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/20 transition-colors disabled:opacity-50"
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          {isUpdating ? "..." : "Prep"}
                        </button>
                      )}
                    {order.queueStatus === "preparing" && (
                      <button
                        onClick={(e) =>
                          updateStatus(e, order.orderId, "serving")
                        }
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        {isUpdating ? "..." : "Serve"}
                      </button>
                    )}
                    {order.queueStatus === "serving" && (
                      <button
                        onClick={(e) => updateStatus(e, order.orderId, "done")}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/20 transition-colors disabled:opacity-50"
                      >
                        ✓ {isUpdating ? "..." : "Done"}
                      </button>
                    )}
                    {order.queueStatus === "done" && (
                      <span className="text-xs text-muted-foreground font-medium">
                        ✓ Finished
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Footer Total */}
        {visibleOrders.length > 0 && (
          <div className="bg-muted/10 border border-border border-dashed rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Page Total
            </span>
            <span className="text-primary font-black">
              ₱
              {visibleOrders
                .reduce((sum, o) => sum + (o.total || 0), 0)
                .toFixed(0)}
            </span>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onPrint={() =>
          selectedOrder &&
          onReprintReceipt &&
          onReprintReceipt(mapToSavedOrder(selectedOrder))
        }
      />
    </div>
  );
}
