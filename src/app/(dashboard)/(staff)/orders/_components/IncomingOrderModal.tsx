"use client";

import React from "react";
import { ShoppingCart, Coffee, Utensils } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomerOrder } from "@/types/order.type";

interface IncomingOrderModalProps {
  order: CustomerOrder | null;
  onClose: () => void;
  onAccept: (order: CustomerOrder) => void;
  onDecline?: (order: CustomerOrder) => void;
  formatCurrency: (val: number) => string;
}

export const IncomingOrderModal = ({
  order,
  onClose,
  onAccept,
  onDecline,
  formatCurrency,
}: IncomingOrderModalProps) => {
  if (!order) return null;

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            New Customer Order
          </DialogTitle>
          <DialogDescription>
            From <span className="font-semibold">{order.customerName}</span>
            {order.orderType === "dine-in" && order.tableNumber && (
              <span> · Table {order.tableNumber}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-10 w-10 rounded-lg object-cover border shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {item.menuType === "drink"
                      ? <Coffee className="h-4 w-4 text-muted-foreground" />
                      : <Utensils className="h-4 w-4 text-muted-foreground" />}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                </div>
              </div>
              <span className="text-sm font-semibold shrink-0">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}

          {order.orderNote && (
            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              📝 {order.orderNote}
            </div>
          )}

          <div className="flex justify-between font-bold text-base pt-3 border-t mt-2">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(order.total ?? 0)}</span>
          </div>
        </DialogBody>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button variant="outline" onClick={() => onDecline ? onDecline(order) : onClose()}>
            Decline
          </Button>
          <Button onClick={() => onAccept(order)}>Accept Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
