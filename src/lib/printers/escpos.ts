// lib/printers/escpos.ts
// ESC/POS command builder optimized for XPrinter 58IIH / 58IIB (58mm paper)

export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;
export const CR = 0x0d;

export const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [ESC, 0x21, 0x10],
  DOUBLE_SIZE_ON: [ESC, 0x21, 0x30],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  CUT_FULL: [GS, 0x56, 0x00],
  CUT_PARTIAL: [GS, 0x56, 0x01],
  FEED_LINES: (n: number) => [ESC, 0x64, n],
  LINE_SPACING_DEFAULT: [ESC, 0x32],
  LINE_SPACING_SET: (n: number) => [ESC, 0x33, n],
} as const;

const LINE_WIDTH = 32; // 58mm paper = 32 chars at normal size

export function buildReceiptBytes(lines: ReceiptLine[]): Uint8Array {
  const chunks: number[] = [...CMD.INIT, ...CMD.LINE_SPACING_DEFAULT];

  for (const line of lines) {
    switch (line.type) {
      case "init":
        chunks.push(...CMD.INIT);
        break;

      case "text": {
        if (line.align === "center") chunks.push(...CMD.ALIGN_CENTER);
        else if (line.align === "right") chunks.push(...CMD.ALIGN_RIGHT);
        else chunks.push(...CMD.ALIGN_LEFT);

        if (line.bold) chunks.push(...CMD.BOLD_ON);
        if (line.doubleSize) chunks.push(...CMD.DOUBLE_SIZE_ON);
        else if (line.doubleHeight) chunks.push(...CMD.DOUBLE_HEIGHT_ON);

        const encoded = encodeText(line.text ?? "");
        chunks.push(...encoded, LF);

        if (line.bold) chunks.push(...CMD.BOLD_OFF);
        if (line.doubleSize || line.doubleHeight)
          chunks.push(...CMD.NORMAL_SIZE);
        chunks.push(...CMD.ALIGN_LEFT);
        break;
      }

      case "two-col": {
        chunks.push(...CMD.ALIGN_LEFT);
        if (line.bold) chunks.push(...CMD.BOLD_ON);
        const row = twoColumnLine(
          line.left ?? "",
          line.right ?? "",
          LINE_WIDTH,
        );
        chunks.push(...encodeText(row), LF);
        if (line.bold) chunks.push(...CMD.BOLD_OFF);
        break;
      }

      case "divider": {
        const char = line.char ?? "-";
        chunks.push(...CMD.ALIGN_LEFT);
        chunks.push(...encodeText(char.repeat(LINE_WIDTH)), LF);
        break;
      }

      case "feed":
        chunks.push(...CMD.FEED_LINES(line.lines ?? 1));
        break;

      case "cut":
        chunks.push(...CMD.FEED_LINES(4));
        chunks.push(...CMD.CUT_PARTIAL);
        break;
    }
  }

  // Always end with feed + cut
  chunks.push(...CMD.FEED_LINES(4), ...CMD.CUT_PARTIAL);

  return new Uint8Array(chunks);
}

function twoColumnLine(left: string, right: string, width: number): string {
  const maxLeft = width - right.length - 1;
  const trimmedLeft =
    left.length > maxLeft ? left.substring(0, maxLeft - 1) + "." : left;
  const spaces = width - trimmedLeft.length - right.length;
  return trimmedLeft + " ".repeat(Math.max(1, spaces)) + right;
}

function encodeText(text: string): number[] {
  // Basic ASCII encoding; replace unsupported chars
  const result: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 128) {
      result.push(code);
    } else {
      // Map common special chars
      const mapped = CHAR_MAP[text[i]];
      if (mapped) result.push(...mapped);
      else result.push(0x3f); // '?'
    }
  }
  return result;
}

// Common special character mappings for ESC/POS CP437
const CHAR_MAP: Record<string, number[]> = {
  "₱": [0x50], // Peso → P
  "©": [0xa9],
  "°": [0xf8],
  "•": [0x07],
  "–": [0x2d],
  "—": [0x2d],
  "\u2019": [0x27], // right single quote → '
  "\u2018": [0x27], // left single quote → '
  "\u201c": [0x22], // left double quote → "
  "\u201d": [0x22], // right double quote → "
};

// ─── Receipt Line Types ───────────────────────────────────────────

export type ReceiptLine =
  | { type: "init" }
  | {
      type: "text";
      text: string;
      align?: "left" | "center" | "right";
      bold?: boolean;
      doubleHeight?: boolean;
      doubleSize?: boolean;
    }
  | { type: "two-col"; left: string; right: string; bold?: boolean }
  | { type: "divider"; char?: string }
  | { type: "feed"; lines?: number }
  | { type: "cut" };

// ─── Receipt Builder ─────────────────────────────────────────────

export interface ReceiptBuildInput {
  orderNumber: string;
  customerName: string;
  cashier: string;
  timestamp: Date;
  orderType: "dine-in" | "takeaway";
  tableNumber?: string;
  orderNote?: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    hasDiscount?: boolean;
    menuType?: "food" | "drink";
  }>;
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: "cash" | "gcash" | "split";
  splitPayment?: { cash: number; gcash: number };
  amountPaid?: number;
  change?: number;
  seniorPwdCount?: number;
  seniorPwdIds?: string[];
  isReprint?: boolean;
  // Business info
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  receiptMessage?: string;
}

export function buildCustomerReceiptLines(
  data: ReceiptBuildInput,
): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  const fmt = (n: number) => `P${n.toFixed(2)}`;

  // Header
  lines.push({
    type: "text",
    text: data.businessName,
    align: "center",
    bold: true,
    doubleHeight: true,
  });
  if (data.businessAddress)
    lines.push({ type: "text", text: data.businessAddress, align: "center" });
  if (data.businessPhone)
    lines.push({ type: "text", text: data.businessPhone, align: "center" });
  lines.push({ type: "divider", char: "=" });

  // Order info
  lines.push({ type: "two-col", left: "Order #:", right: data.orderNumber });
  lines.push({
    type: "two-col",
    left: "Date:",
    right: new Date(data.timestamp).toLocaleDateString(),
  });
  lines.push({
    type: "two-col",
    left: "Time:",
    right: new Date(data.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  lines.push({ type: "two-col", left: "Cashier:", right: data.cashier });
  lines.push({
    type: "two-col",
    left: "Customer:",
    right: data.customerName || "Walk-in",
  });
  lines.push({
    type: "two-col",
    left: "Type:",
    right: data.orderType === "dine-in" ? "Dine In" : "Take Away",
  });
  if (data.orderType === "dine-in" && data.tableNumber)
    lines.push({ type: "two-col", left: "Table:", right: data.tableNumber });
  if (data.orderNote)
    lines.push({ type: "text", text: `Note: ${data.orderNote}` });
  lines.push({ type: "divider" });

  // Items header
  lines.push({
    type: "text",
    text: "ITEM                  QTY   AMT",
    bold: true,
  });
  lines.push({ type: "divider" });

  // Items
  for (const item of data.items) {
    const discountedPrice = item.hasDiscount ? item.price * 0.8 : item.price;
    const itemTotal = discountedPrice * item.quantity;
    const nameCol = item.name.substring(0, 20).padEnd(20);
    const qtyCol = String(item.quantity).padStart(4);
    const amtCol = itemTotal.toFixed(2).padStart(7);
    lines.push({ type: "text", text: `${nameCol}${qtyCol} ${amtCol}` });
    if (item.hasDiscount) {
      lines.push({ type: "text", text: "  [20% Senior/PWD Disc]" });
    }
  }

  lines.push({ type: "divider" });

  // Totals
  lines.push({ type: "two-col", left: "Subtotal:", right: fmt(data.subtotal) });
  if (data.discountTotal > 0) {
    lines.push({
      type: "two-col",
      left: "Discount:",
      right: `-${fmt(data.discountTotal)}`,
    });
  }
  lines.push({ type: "divider" });
  lines.push({
    type: "two-col",
    left: "TOTAL:",
    right: fmt(data.total),
    bold: true,
  });
  lines.push({ type: "divider" });

  // Payment
  lines.push({
    type: "two-col",
    left: "Payment:",
    right: data.paymentMethod.toUpperCase(),
  });
  if (data.paymentMethod === "split" && data.splitPayment) {
    lines.push({
      type: "two-col",
      left: "  Cash:",
      right: fmt(data.splitPayment.cash),
    });
    lines.push({
      type: "two-col",
      left: "  GCash:",
      right: fmt(data.splitPayment.gcash),
    });
  }
  if (data.paymentMethod === "cash" && data.amountPaid !== undefined) {
    lines.push({
      type: "two-col",
      left: "Tendered:",
      right: fmt(data.amountPaid),
    });
    lines.push({
      type: "two-col",
      left: "Change:",
      right: fmt((data.amountPaid ?? 0) - data.total),
    });
  }

  // Senior/PWD IDs
  if (data.seniorPwdIds?.length) {
    lines.push({ type: "divider" });
    lines.push({ type: "text", text: "Senior/PWD ID(s):" });
    data.seniorPwdIds.forEach((id) =>
      lines.push({ type: "text", text: `  ${id}` }),
    );
  }

  lines.push({ type: "divider", char: "=" });

  // Footer
  if (data.receiptMessage)
    lines.push({ type: "text", text: data.receiptMessage, align: "center" });
  lines.push({
    type: "text",
    text: "Thank you for dining with us!",
    align: "center",
  });
  lines.push({ type: "text", text: `[${data.orderNumber}]`, align: "center" });

  if (data.isReprint) {
    lines.push({ type: "divider" });
    lines.push({
      type: "text",
      text: "*** REPRINT ***",
      align: "center",
      bold: true,
    });
  }

  lines.push({ type: "cut" });
  return lines;
}

export function buildKitchenOrderLines(data: ReceiptBuildInput): ReceiptLine[] {
  const lines: ReceiptLine[] = [];

  lines.push({
    type: "text",
    text: "*** KITCHEN ORDER ***",
    align: "center",
    bold: true,
    doubleHeight: true,
  });
  lines.push({ type: "divider", char: "=" });

  lines.push({
    type: "two-col",
    left: "Order #:",
    right: data.orderNumber,
    bold: true,
  });
  lines.push({
    type: "two-col",
    left: "Time:",
    right: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  lines.push({
    type: "two-col",
    left: "Staff:",
    right: data.cashier,
  });
  lines.push({
    type: "two-col",
    left: "Type:",
    right: data.orderType === "dine-in" ? "DINE IN" : "TAKE AWAY",
  });
  if (data.orderType === "dine-in" && data.tableNumber)
    lines.push({
      type: "two-col",
      left: "Table:",
      right: data.tableNumber,
      bold: true,
    });
  if (data.customerName)
    lines.push({
      type: "two-col",
      left: "Customer:",
      right: data.customerName,
    });

  lines.push({ type: "divider", char: "=" });

  // Filter out drinks for kitchen - only food categories are printed in kitchen
  for (const item of data.items) {
    if (item.menuType !== "food") continue;
    lines.push({
      type: "text",
      text: `${item.quantity}x  ${item.name}`,
      bold: true,
      doubleHeight: true,
    });
  }

  lines.push({ type: "divider", char: "=" });

  if (data.orderNote) {
    lines.push({ type: "text", text: "NOTE:", bold: true });
    lines.push({ type: "text", text: data.orderNote });
    lines.push({ type: "divider" });
  }

  lines.push({
    type: "text",
    text: "*** PLEASE PREPARE ***",
    align: "center",
    bold: true,
  });
  lines.push({ type: "cut" });

  return lines;
}
