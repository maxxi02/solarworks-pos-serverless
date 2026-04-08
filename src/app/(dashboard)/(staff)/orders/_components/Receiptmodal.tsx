"use client";

import { BluetoothConnected, BluetoothOff, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanionPrintButton } from "@/components/ui/companion-print-button";
import { ReceiptOrder } from "./pos.types";
import { DISCOUNT_RATE } from "./pos.utils";
import { useMemo } from "react";
import { useSocket } from "@/provider/socket-provider";
import {
  Dialog,
  DialogBody,
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

export const ReceiptModal = ({ receipt, settings, onClose, onPrint, isPrinting }: ReceiptModalProps) => {
  const { isConnected: companionConnected } = useSocket();

  const rawText = useMemo(() => {
    if (!receipt || !settings) return "";

    const is58mm = settings.receiptWidth !== "80mm";
    const W = is58mm ? 32 : 42;
    const dash = "-".repeat(W);
    const eq = "=".repeat(W);

    const center = (text: string) => {
      const pad = Math.max(0, Math.floor((W - text.length) / 2));
      return " ".repeat(pad) + text;
    };

    const lr = (left: string, right: string) => {
      const maxLeft = W - right.length - 1;
      const l = left.length > maxLeft ? left.substring(0, maxLeft - 1) + "…" : left;
      const gap = Math.max(1, W - l.length - right.length);
      return l + " ".repeat(gap) + right;
    };

    const NAME_W = W - 13;
    const itemRow = (name: string, qty: string, price: string) => {
      const n = name.length > NAME_W ? name.substring(0, NAME_W - 1) + "…" : name.padEnd(NAME_W);
      return `${n}${qty.padStart(4)}${price.padStart(8)}`;
    };

    const fmt = (n: number) => `P${n.toFixed(2)}`;
    let lines: string[] = [];

    if (receipt.isReprint) lines.push(center("*** REPRINT ***"));
    lines.push(center((settings.businessName || "RENDEZVOUS CAFE").toUpperCase()));
    if (settings.locationAddress) lines.push(center(settings.locationAddress));
    if (settings.phoneNumber) lines.push(center(settings.phoneNumber));
    lines.push(eq);

    lines.push(lr("Order #:", receipt.orderNumber));
    lines.push(lr("Date:", new Date(receipt.timestamp).toLocaleString()));
    lines.push(lr("Cashier:", receipt.cashier || "Staff"));
    lines.push(lr("Type:", receipt.orderType === "dine-in" ? "Dine-in" : "Take Away"));
    if (receipt.tableNumber) lines.push(lr("Table:", receipt.tableNumber));
    if (receipt.customerName) lines.push(lr("Customer:", receipt.customerName));
    lines.push(dash);

    lines.push(itemRow("ITEM", "QTY", "AMOUNT"));
    lines.push(dash);

    receipt.items.forEach((item) => {
      const price = item.hasDiscount ? item.price * (1 - DISCOUNT_RATE) : item.price;
      lines.push(itemRow(item.name, String(item.quantity), fmt(price * item.quantity)));
      if (item.hasDiscount) lines.push("  (20% Senior/PWD Discount)");
    });
    lines.push(dash);

    lines.push(lr("Subtotal:", fmt(receipt.subtotal)));
    if (receipt.discountTotal > 0) lines.push(lr("Discount:", `-${fmt(receipt.discountTotal)}`));
    lines.push(eq);
    lines.push(lr("TOTAL:", `PHP ${receipt.total.toFixed(2)}`));
    lines.push(eq);

    const method = receipt.paymentMethod;
    if (method === "split" && receipt.splitPayment) {
      lines.push(lr("Payment Method:", "Split (Cash+GCash)"));
      lines.push(lr("  Cash:", fmt(receipt.splitPayment.cash)));
      lines.push(lr("  GCash:", fmt(receipt.splitPayment.gcash)));
      const splitChange = (receipt.amountPaid ?? 0) > receipt.total ? (receipt.amountPaid ?? 0) - receipt.total : 0;
      lines.push(dash);
      lines.push(lr("Change:", fmt(splitChange)));
    } else if (method === "gcash") {
      lines.push(lr("Payment Method:", "GCash"));
      lines.push(lr("  GCash:", `PHP ${receipt.total.toFixed(2)}`));
      lines.push(dash);
    } else {
      lines.push(lr("Payment Method:", "Cash"));
      lines.push(lr("  Cash:", fmt(receipt.amountPaid ?? receipt.total)));
      lines.push(dash);
      lines.push(lr("Change:", fmt(receipt.change || 0)));
    }
    lines.push(dash);

    if (settings.receiptMessage) lines.push(center(settings.receiptMessage));
    if (!settings.sections?.disclaimer?.disabled && settings.disclaimer) {
      lines.push(center(settings.disclaimer));
    }

    return lines.join("\n");
  }, [receipt, settings]);

  if (!receipt || !settings) return null;

  return (
    <Dialog open={!!receipt} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-[450px]">
        <DialogHeader className="border-b pb-4 bg-muted/30">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="w-5 h-5 text-primary" />
              {receipt.isReprint ? "Reprint Receipt" : "Order Receipt"}
            </DialogTitle>
            <span className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
              companionConnected ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
            }`}>
              {companionConnected
                ? <><BluetoothConnected className="w-3 h-3" />Online</>
                : <><BluetoothOff className="w-3 h-3" />Offline</>}
            </span>
          </div>
        </DialogHeader>

        <DialogBody>
          <div className="rounded-lg border bg-slate-50 dark:bg-zinc-950 p-4 font-mono text-[13px] leading-relaxed shadow-inner overflow-x-auto">
            <pre className="whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
              {rawText}
            </pre>
          </div>
        </DialogBody>

        <DialogFooter className="border-t pt-4 gap-2">
          <CompanionPrintButton
            onClick={onPrint}
            isPrinting={isPrinting}
            label="Print Receipt"
            iconSize="w-4 h-4"
            className="flex-1 h-10"
          />
          <Button onClick={onClose} variant="outline" className="flex-1 h-10 font-semibold">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
