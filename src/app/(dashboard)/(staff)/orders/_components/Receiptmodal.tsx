"use client";

import {
  Printer,
  BluetoothConnected,
  BluetoothOff,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptOrder } from "./pos.types";
import { formatCurrency, DISCOUNT_RATE } from "./pos.utils";
import { useEffect, useState, useMemo } from "react";
import { useSocket } from "@/provider/socket-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ReceiptModalProps {
  receipt: ReceiptOrder | null;
  settings: any;
  onClose: () => void;
  onPrint: () => void;
  isPrinting?: boolean;
}

export const ReceiptModal = ({
  receipt,
  settings,
  onClose,
  onPrint,
  isPrinting,
}: ReceiptModalProps) => {
  const { isConnected: companionConnected } = useSocket();

  const rawText = useMemo(() => {
    if (!receipt || !settings) return "";

    const is58mm = settings.receiptWidth === "58mm";
    const width = is58mm ? 32 : 42;
    const dash = "-".repeat(width);
    const center = (text: string) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return " ".repeat(padding) + text;
    };
    const justify = (left: string, right: string) => {
      const space = Math.max(1, width - left.length - right.length);
      return left + " ".repeat(space) + right;
    };

    let lines: string[] = [];

    // Header
    if (receipt.isReprint) lines.push(center("*** REPRINT ***"));
    lines.push(center(settings.businessName || "RENDEZVOUS CAFE"));
    if (settings.locationAddress) lines.push(center(settings.locationAddress));
    if (settings.phoneNumber) lines.push(center(settings.phoneNumber));
    lines.push(dash);

    // Order Info
    lines.push(justify("Order #:", receipt.orderNumber));
    lines.push(justify("Date:", new Date(receipt.timestamp).toLocaleString()));
    lines.push(justify("Cashier:", receipt.cashier || "Staff"));
    lines.push(justify("Type:", receipt.orderType.toUpperCase()));
    if (receipt.tableNumber) lines.push(justify("Table:", receipt.tableNumber));
    if (receipt.customerName) lines.push(justify("Customer:", receipt.customerName));
    lines.push(dash);

    // Items
    lines.push(justify("ITEM", "QTY   AMT"));
    receipt.items.forEach((item) => {
      const price = item.hasDiscount ? item.price * (1 - DISCOUNT_RATE) : item.price;
      const amt = (price * item.quantity).toFixed(2);
      lines.push(justify(item.name, `${item.quantity}  ${amt}`));
      if (item.hasDiscount) {
        lines.push("  (20% Senior/PWD Discount)");
      }
    });
    lines.push(dash);

    // Totals
    lines.push(justify("Subtotal:", receipt.subtotal.toFixed(2)));
    if (receipt.discountTotal > 0) {
      lines.push(justify("Discount:", `-${receipt.discountTotal.toFixed(2)}`));
    }
    lines.push(justify("TOTAL:", `PHP ${receipt.total.toFixed(2)}`));
    lines.push(dash);

    // Payment
    lines.push(justify("Payment:", receipt.paymentMethod.toUpperCase()));
    if (receipt.paymentMethod === "cash" && receipt.amountPaid) {
      lines.push(justify("Amount Paid:", receipt.amountPaid.toFixed(2)));
      lines.push(justify("Change:", (receipt.change || 0).toFixed(2)));
    } else if (receipt.paymentMethod === "split" && receipt.splitPayment) {
      lines.push(justify("Cash:", receipt.splitPayment.cash.toFixed(2)));
      lines.push(justify("GCash:", receipt.splitPayment.gcash.toFixed(2)));
    }
    lines.push(dash);

    // Footer
    if (settings.receiptMessage) lines.push(center(settings.receiptMessage));
    lines.push(center("Thank you for your patronage!"));

    return lines.join("\n");
  }, [receipt, settings]);

  if (!receipt || !settings) return null;

  return (
    <Dialog open={!!receipt} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FileText className="w-5 h-5 text-primary" />
              {receipt.isReprint ? "Reprint Receipt" : "Order Receipt"}
            </DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              <span
                className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${companionConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
              >
                {companionConnected ? (
                  <>
                    <BluetoothConnected className="w-3 h-3" />
                    Online
                  </>
                ) : (
                  <>
                    <BluetoothOff className="w-3 h-3" />
                    Offline
                  </>
                )}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-white dark:bg-black">
          <div className="rounded-lg border bg-slate-50 dark:bg-zinc-950 p-4 font-mono text-[13px] leading-relaxed shadow-inner overflow-x-auto">
            <pre className="whitespace-pre whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
              {rawText}
            </pre>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex sm:flex-row gap-3">
          <Button
            onClick={onPrint}
            disabled={isPrinting}
            className="flex-1 gap-2 h-11 text-base font-bold shadow-sm"
            variant={companionConnected ? "default" : "secondary"}
          >
            <Printer className="w-5 h-5" />
            {isPrinting ? "Printing..." : "Print Receipt"}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-11 text-base font-bold border-2"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
