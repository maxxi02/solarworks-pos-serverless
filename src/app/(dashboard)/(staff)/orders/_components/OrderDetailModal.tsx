"use client";

import { Coffee, Utensils, Clock, User, MapPin, FileText, Printer } from "lucide-react";
import { CustomerOrder } from "@/types/order.type";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface OrderDetailModalProps {
  order: CustomerOrder | null;
  onClose: () => void;
  onPrint?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "New Order",  color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  paid:            { label: "Paid",       color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  preparing:       { label: "Preparing",  color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  serving:         { label: "Serving",    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  served:          { label: "Served",     color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  completed:       { label: "Completed",  color: "bg-muted text-muted-foreground border-border" },
  cancelled:       { label: "Cancelled",  color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function formatTime(date: Date | string | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function OrderDetailModal({ order, onClose, onPrint }: OrderDetailModalProps) {
  if (!order) return null;

  const status = statusConfig[order.queueStatus || "pending_payment"] ?? statusConfig["pending_payment"];
  const canPrint = order.queueStatus !== "pending_payment" && !!onPrint;

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              Order {order.orderNumber || order.orderId.slice(0, 8)}
            </DialogTitle>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border mr-8 ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{order.customerName}</span>
            {order.tableNumber && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Table {order.tableNumber}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{formatTime(order.createdAt || order.timestamp)}
            </span>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Items ({order.items.length})
          </p>

          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name}
                  className="w-14 h-14 rounded-lg object-cover shrink-0 border" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 border">
                  {item.menuType === "drink"
                    ? <Coffee className="w-5 h-5 text-muted-foreground" />
                    : <Utensils className="w-5 h-5 text-muted-foreground" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                    {item.menuType || "none"}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">₱{(item.price * item.quantity).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">₱{item.price.toFixed(0)} each</p>
              </div>
            </div>
          ))}

          {order.orderNote && (
            <div className="flex gap-2 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">{order.orderNote}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
            {order.paidAt     && <span>💳 Paid: {formatTime(order.paidAt)}</span>}
            {order.preparingAt && <span>👨‍🍳 Preparing: {formatTime(order.preparingAt)}</span>}
            {order.servingAt  && <span>🍽️ Serving: {formatTime(order.servingAt)}</span>}
            {order.servedAt   && <span>✅ Served: {formatTime(order.servedAt)}</span>}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-semibold text-sm">Total</span>
            <span className="font-bold text-lg text-primary">₱{order.total?.toFixed(0)}</span>
          </div>
        </DialogBody>

        <DialogFooter className="border-t pt-4 sm:justify-between gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canPrint && (
            <Button onClick={onPrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
