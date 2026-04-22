// src/types/order.type.ts

export type QrType = "dine-in" | "walk-in" | "drive-thru";

export type QueueStatus =
  | "pending_payment"
  | "queueing"
  | "preparing"
  | "serving"
  | "done"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface CustomerOrderItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  category?: string;
  menuType?: "food" | "drink";
  imageUrl?: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
}

export interface CustomerOrder {
  orderId: string;
  orderNumber?: string;
  sessionId?: string;
  tableId?: string;
  qrType?: QrType;
  customerName: string;
  customerId?: string;
  items: CustomerOrderItem[];
  orderNote?: string;
  orderType: "dine-in" | "takeaway";
  tableNumber?: string;
  subtotal: number;
  total: number;
  timestamp: Date;

  // Payment
  paymentMethod?: "cash" | "gcash" | "qrph" | "split" | "card";
  paymentStatus?: PaymentStatus;
  paymentReference?: string;

  // Queue
  queueStatus?: QueueStatus;

  // Timestamps
  createdAt?: Date;
  paidAt?: Date;
  queueingAt?: Date;
  preparingAt?: Date;
  servingAt?: Date;
  servedAt?: Date;
  doneAt?: Date;
  cancelledAt?: Date;
}
