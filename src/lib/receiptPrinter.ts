// lib/receiptPrinter.ts
// Updated to route through printerManager (WebUSB + Web Bluetooth)
// Falls back to browser print dialog if hardware unavailable

import { ReceiptSettings } from "@/types/receipt";
import { printerManager } from "@/lib/printers/printerManager";
import { ReceiptBuildInput } from "@/lib/printers/escpos";
import { toast } from "sonner";

export interface ReceiptData {
  id: string;
  orderNumber: string;
  customerName: string;
  items: Array<{
    _id: string;
    name: string;
    price: number;
    quantity: number;
    hasDiscount?: boolean;
    category?: string;
    menuType?: "food" | "drink";
    notes?: string;
  }>;
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: "cash" | "gcash" | "split";
  splitPayment?: { cash: number; gcash: number };
  orderType: "dine-in" | "takeaway";
  tableNumber?: string;
  timestamp: Date;
  status: "pending" | "completed" | "cancelled";
  seniorPwdCount?: number;
  orderNote?: string;
  cashier: string;
  cashierId?: string;
  seniorPwdIds?: string[];
  isReprint?: boolean;
  reprintCount?: number;
  amountPaid?: number;
  change?: number;
  customerReceiptPrinted?: boolean;
  kitchenReceiptPrinted?: boolean;
}

// ─── Map ReceiptData → ReceiptBuildInput ──────────────────────────

function toReceiptBuildInput(
  receipt: ReceiptData,
  settings: ReceiptSettings,
): ReceiptBuildInput {
  return {
    orderNumber: receipt.orderNumber,
    customerName: receipt.customerName || "Walk-in Customer",
    cashier: receipt.cashier,
    timestamp: receipt.timestamp,
    orderType: receipt.orderType,
    tableNumber: receipt.tableNumber,
    orderNote: receipt.orderNote,
    items: receipt.items.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      hasDiscount: item.hasDiscount,
      menuType: item.menuType,
    })),
    subtotal: receipt.subtotal,
    discountTotal: receipt.discountTotal,
    total: receipt.total,
    paymentMethod: receipt.paymentMethod,
    splitPayment: receipt.splitPayment,
    amountPaid: receipt.amountPaid,
    change: receipt.change,
    seniorPwdCount: receipt.seniorPwdCount,
    seniorPwdIds: receipt.seniorPwdIds,
    isReprint: receipt.isReprint,
    businessName: settings.businessName || "Rendezvous Cafe",
    businessAddress: settings.locationAddress,
    businessPhone: settings.phoneNumber,
    businessLogo:
      settings.showLogo && settings.logo ? settings.logo : undefined,
    receiptMessage: settings.receiptMessage,
  };
}

// ─── Main print function ──────────────────────────────────────────

export async function printReceipt(
  receipt: ReceiptData,
  settings: ReceiptSettings,
): Promise<{ customer: boolean; kitchen: boolean }> {
  const results = { customer: false, kitchen: false };
  const input = toReceiptBuildInput(receipt, settings);

  // ── Customer Receipt (USB) ──
  if (settings.printReceipt) {
    if (
      printerManager.getStatus().usb === "connected" ||
      printerManager.getStatus().usb === "printing"
    ) {
      results.customer = await printerManager.printReceipt(input);
      if (results.customer) {
        toast.success("Receipt printed");
      } else {
        toast.warning("USB printer failed — opening print dialog");
        results.customer = fallbackBrowserPrint(receipt, settings, "customer");
      }
    } else {
      toast.info("USB printer not connected — opening print dialog");
      results.customer = fallbackBrowserPrint(receipt, settings, "customer");
    }
  }

  // ── Kitchen Order (Bluetooth) ──
  const hasFood = receipt.items.some((item) => item.menuType === "food");
  if (settings.kitchenPrinter?.enabled && hasFood) {
    if (
      printerManager.getStatus().bluetooth === "connected" ||
      printerManager.getStatus().bluetooth === "printing"
    ) {
      results.kitchen = await printerManager.printKitchenOrder(input);
      if (results.kitchen) {
        toast.success("Kitchen order printed");
      } else {
        toast.warning("Bluetooth printer failed — opening print dialog");
        results.kitchen = fallbackBrowserPrint(receipt, settings, "kitchen");
      }
    } else {
      toast.info("Kitchen printer not connected — opening print dialog");
      results.kitchen = fallbackBrowserPrint(receipt, settings, "kitchen");
    }
  }

  // Update DB print status
  try {
    await fetch(`/api/receipts/${receipt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerReceiptPrinted: results.customer,
        kitchenReceiptPrinted: results.kitchen,
        ...(receipt.isReprint
          ? { reprintCount: (receipt.reprintCount || 0) + 1 }
          : {}),
      }),
    });
  } catch {
    /* non-critical */
  }

  return results;
}

// ─── Browser fallback (existing logic, preserved) ─────────────────

function fallbackBrowserPrint(
  receipt: ReceiptData,
  settings: ReceiptSettings,
  type: "customer" | "kitchen",
): boolean {
  try {
    const title = type === "kitchen" ? "Kitchen Order" : "Customer Receipt";
    const content =
      type === "kitchen"
        ? buildKitchenText(receipt)
        : buildReceiptText(receipt, settings);

    const w = window.open("", "_blank");
    if (!w) return false;

    w.document.write(`<!DOCTYPE html><html><head>
      <title>${title}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px;
               width: 58mm; margin: 0 auto; padding: 4px; }
        pre { white-space: pre-wrap; margin: 0; }
        .no-print { text-align: center; margin-top: 12px; }
        button { padding: 8px 16px; margin: 4px; cursor: pointer; }
        @media print { .no-print { display: none; } }
      </style>
    </head><body>
      <pre>${content}</pre>
      <div class="no-print">
        <button onclick="window.print()">Print</button>
        <button onclick="window.close()">Close</button>
      </div>
      <script>setTimeout(() => window.print(), 800);</script>
    </body></html>`);
    w.document.close();
    return true;
  } catch {
    return false;
  }
}

function buildReceiptText(
  receipt: ReceiptData,
  settings: ReceiptSettings,
): string {
  const W = 32;
  const c = (t: string) =>
    " ".repeat(Math.max(0, Math.floor((W - t.length) / 2))) + t;
  const lr = (l: string, r: string) => {
    const maxL = W - r.length - 1;
    const left = l.length > maxL ? l.substring(0, maxL - 1) + "…" : l;
    const sp = Math.max(1, W - left.length - r.length);
    return left + " ".repeat(sp) + r;
  };
  const fmt = (n: number) => `P${n.toFixed(2)}`;
  const div = "-".repeat(W);
  const dbDiv = "=".repeat(W);

  const NAME_W = W - 13; // 19 chars for name
  const itemRow = (name: string, qty: string, price: string) => {
    const n =
      name.length > NAME_W
        ? name.substring(0, NAME_W - 1) + "…"
        : name.padEnd(NAME_W);
    return `${n}${qty.padStart(4)}${price.padStart(9)}`;
  };

  let s = "";
  s += c((settings.businessName || "Rendezvous Cafe").toUpperCase()) + "\n";
  if (settings.locationAddress) s += c(settings.locationAddress) + "\n";
  if (settings.phoneNumber) s += c(settings.phoneNumber) + "\n";
  s += dbDiv + "\n";
  s += lr("Order #:", receipt.orderNumber) + "\n";
  s += lr("Date:", new Date(receipt.timestamp).toLocaleDateString()) + "\n";
  s += lr("Cashier:", receipt.cashier) + "\n";
  s += lr("Customer:", receipt.customerName || "Walk-in") + "\n";
  s +=
    lr("Type:", receipt.orderType === "dine-in" ? "Dine In" : "Take Away") +
    "\n";
  if (receipt.orderType === "dine-in" && receipt.tableNumber)
    s += lr("Table:", receipt.tableNumber) + "\n";
  s += div + "\n";
  s += itemRow("ITEM", "QTY", "AMOUNT") + "\n";
  s += div + "\n";
  receipt.items.forEach((item) => {
    const p = item.hasDiscount ? item.price * 0.8 : item.price;
    const tot = (p * item.quantity).toFixed(2);
    s += itemRow(item.name, String(item.quantity), `P${tot}`) + "\n";
    if (item.hasDiscount) s += "  [Senior/PWD 20% off]\n";
  });
  s += div + "\n";
  s += lr("Subtotal:", fmt(receipt.subtotal)) + "\n";
  if (receipt.discountTotal > 0)
    s += lr("Discount:", `-${fmt(receipt.discountTotal)}`) + "\n";
  s += dbDiv + "\n";
  s += lr("TOTAL:", fmt(receipt.total)) + "\n";
  s += dbDiv + "\n";
  s += "Payment Method:\n";
  if (receipt.paymentMethod === "split" && receipt.splitPayment) {
    s += lr("  Cash:", fmt(receipt.splitPayment.cash)) + "\n";
    s += lr("  GCash:", fmt(receipt.splitPayment.gcash)) + "\n";
    s += div + "\n";
    s += lr("Total:", fmt(receipt.total)) + "\n";
    const splitChange = (receipt.amountPaid ?? 0) > receipt.total
      ? (receipt.amountPaid ?? 0) - receipt.total : 0;
    s += lr("Change:", fmt(splitChange)) + "\n";
  } else if (receipt.paymentMethod === "gcash") {
    s += lr("  GCash:", fmt(receipt.total)) + "\n";
    s += div + "\n";
    s += lr("Total:", fmt(receipt.total)) + "\n";
  } else {
    s += lr("  Cash:", fmt(receipt.amountPaid ?? receipt.total)) + "\n";
    s += div + "\n";
    s += lr("Total:", fmt(receipt.total)) + "\n";
    s += lr("Change:", fmt(receipt.amountPaid ? receipt.amountPaid - receipt.total : 0)) + "\n";
  }
  s += dbDiv + "\n";
  s += c(settings.receiptMessage || "Thank you!") + "\n";
  if (receipt.isReprint) s += c("REPRINT") + "\n";
  return s;
}

function buildKitchenText(receipt: ReceiptData): string {
  const W = 32;
  const c = (t: string) =>
    " ".repeat(Math.max(0, Math.floor((W - t.length) / 2))) + t;
  const lr = (l: string, r: string) => {
    const sp = Math.max(1, W - l.length - r.length);
    return l + " ".repeat(sp) + r;
  };
  const dbDiv = "=".repeat(W);

  let s = "";
  s += c("KITCHEN ORDER") + "\n";
  s += dbDiv + "\n";
  s += lr("Order #:", receipt.orderNumber) + "\n";
  s +=
    lr(
      "Time:",
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    ) + "\n";
  s += lr("Staff:", receipt.cashier) + "\n";
  s +=
    lr("Type:", receipt.orderType === "dine-in" ? "DINE IN" : "TAKE AWAY") +
    "\n";
  if (receipt.orderType === "dine-in" && receipt.tableNumber)
    s += lr("Table:", receipt.tableNumber) + "\n";
  if (receipt.customerName) s += lr("Customer:", receipt.customerName) + "\n";
  s += dbDiv + "\n";
  s += c("TO COOK") + "\n";
  s += dbDiv + "\n";
  receipt.items.forEach((item) => {
    if (item.menuType !== "food") return;
    s += `${item.quantity}x  ${item.name}\n`;
  });
  s += dbDiv + "\n";
  if (receipt.orderNote) s += `NOTE: ${receipt.orderNote}\n` + dbDiv + "\n";
  s += c("PLEASE PREPARE") + "\n";
  return s;
}

// ─── Preview (unchanged) ─────────────────────────────────────────

export function previewReceipt(
  receipt: ReceiptData,
  settings: ReceiptSettings,
  type: "customer" | "kitchen" = "customer",
): void {
  fallbackBrowserPrint(receipt, settings, type);
}
