"use client";

import { useState } from "react";
import {
  Clock,
  Utensils,
  User,
  Car,
  ChevronRight,
  CheckCheck,
} from "lucide-react";
import { CustomerOrder, QueueStatus } from "@/types/order.type";
import { useSocket } from "@/provider/socket-provider";

interface QueueOrderCardProps {
  order: CustomerOrder;
  onPrintKitchenSlip?: (order: CustomerOrder) => void;
}

const qrTypeBadge: Record<
  string,
  { icon: typeof Utensils; label: string; color: string }
> = {
  "dine-in": {
    icon: Utensils,
    label: "Dine In",
    color: "text-blue-400 bg-blue-500/10",
  },
  "walk-in": {
    icon: User,
    label: "Walk In",
    color: "text-emerald-400 bg-emerald-500/10",
  },
  "drive-thru": {
    icon: Car,
    label: "Drive Thru",
    color: "text-orange-400 bg-orange-500/10",
  },
};

const statusConfig: Record<
  string,
  {
    label: string;
    color: string;
    nextStatus: QueueStatus | null;
    nextLabel: string;
    nextIcon: typeof ChevronRight;
    nextColor: string;
  }
> = {
  queueing: {
    label: "⏳ Queueing",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    nextStatus: "preparing",
    nextLabel: "Start Prep",
    nextIcon: ChevronRight,
    nextColor: "bg-orange-600 hover:bg-orange-500 text-white",
  },
  preparing: {
    label: "👨‍🍳 Preparing",
    color: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    nextStatus: "serving",
    nextLabel: "Start Serving",
    nextIcon: ChevronRight,
    nextColor: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
  serving: {
    label: "🍽️ Serving",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    nextStatus: "done",
    nextLabel: "Mark Done",
    nextIcon: CheckCheck,
    nextColor: "bg-purple-600 hover:bg-purple-500 text-white",
  },
  done: {
    label: "✅ Done",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    nextStatus: null,
    nextLabel: "",
    nextIcon: CheckCheck,
    nextColor: "",
  },
  pending_payment: {
    label: "💳 Pending Payment",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    nextStatus: null,
    nextLabel: "",
    nextIcon: ChevronRight,
    nextColor: "",
  },
};

function getElapsedTime(timestamp: Date | string): string {
  const created = new Date(timestamp);
  const diffMs = Date.now() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
}

export function QueueOrderCard({ order, onPrintKitchenSlip }: QueueOrderCardProps) {
  const { emitOrderQueueUpdate } = useSocket();
  const [advancing, setAdvancing] = useState(false);

  const currentStatus = order.queueStatus || "queueing";
  const cfg = statusConfig[currentStatus] || statusConfig["queueing"];
  const badge = qrTypeBadge[order.qrType || "dine-in"];
  const BadgeIcon = badge?.icon || Utensils;
  const NextIcon = cfg.nextIcon;

  const itemsSummary = order.items
    .slice(0, 3)
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(", ");
  const moreItems =
    order.items.length > 3 ? ` +${order.items.length - 3} more` : "";

  const handleAdvance = async () => {
    if (!cfg.nextStatus || advancing) return;
    setAdvancing(true);
    try {
      if (cfg.nextStatus === "preparing" && onPrintKitchenSlip) {
        onPrintKitchenSlip(order);
      }
      emitOrderQueueUpdate(order.orderId, cfg.nextStatus);
    } finally {
      setTimeout(() => setAdvancing(false), 800);
    }
  };

  return (
    <div className="rounded-lg border bg-background border-border hover:border-primary/30 hover:shadow-sm transition-all p-3 space-y-2">
      {/* Top row: Order # + Status badge */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground text-sm">
          {order.orderNumber || order.orderId.slice(0, 8)}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}
        >
          {cfg.label}
        </span>
      </div>

      {/* Customer + Table */}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {order.customerName}
        </span>
        {order.tableNumber && (
          <span className="ml-1.5 text-muted-foreground">
            • Table {order.tableNumber}
          </span>
        )}
      </p>

      {/* Type badge */}
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge?.color || ""}`}
      >
        <BadgeIcon className="w-3 h-3" />
        {badge?.label || "Order"}
      </span>

      {/* Items */}
      <p className="text-xs text-muted-foreground line-clamp-2">
        {itemsSummary}
        {moreItems}
      </p>

      {/* Note */}
      {order.orderNote && (
        <p className="text-xs text-amber-400/80 italic line-clamp-1">
          &quot;{order.orderNote}&quot;
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
          <Clock className="w-3 h-3" />
          {getElapsedTime(order.createdAt || order.timestamp)}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground text-xs">
            ₱{order.total?.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Action button */}
      {cfg.nextStatus && (
        <button
          onClick={handleAdvance}
          disabled={advancing}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-60 ${cfg.nextColor}`}
        >
          <NextIcon className="w-3.5 h-3.5" />
          {advancing ? "Updating…" : cfg.nextLabel}
        </button>
      )}
    </div>
  );
}
