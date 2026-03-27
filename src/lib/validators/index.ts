import { z } from "zod";

// --- Common ---
export const PaginationSchema = z.object({
  page: z.string().optional().transform(v => Math.max(1, parseInt(v || "1"))),
  limit: z.string().optional().transform(v => Math.min(100, Math.max(1, parseInt(v || "20")))),
  search: z.string().optional(),
});

// --- Products ---
export const ProductQuerySchema = PaginationSchema.extend({
  categoryId: z.string().optional(),
});

// --- Orders ---
export const OrderStatusSchema = z.enum([
  "pending_payment",
  "queueing",
  "preparing",
  "serving",
  "done",
  "cancelled",
]);

export const UpdateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  queueStatus: OrderStatusSchema,
});

// --- Payments ---
export const PaymentMethodSchema = z.enum(["cash", "gcash", "split", "card"]);

export const CreatePaymentSchema = z.object({
  orderNumber: z.string().min(1),
  orderId: z.string().optional(),
  customerName: z.string().optional().default("Guest"),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    variant: z.string().optional(),
  })).min(1),
  subtotal: z.number().nonnegative(),
  discountTotal: z.number().nonnegative().default(0),
  total: z.number().positive(),
  paymentMethod: PaymentMethodSchema,
  amountPaid: z.number().nonnegative(),
  change: z.number().nonnegative().default(0),
  cashierId: z.string().optional(),
  cashierName: z.string().optional(),
  shopId: z.string().optional(),
  timestamp: z.string().optional().transform(v => v ? new Date(v) : new Date()),
});

// --- Admin ---
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional().default(""),
  password: z.string().min(8),
  role: z.enum(["admin", "staff", "manager", "customer"]).default("staff"),
});

// --- Kiosk ---
export const CreateKioskOrderSchema = z.object({
  customerName: z.string().optional().default("Kiosk Guest"),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    quantity: z.number().min(1),
    price: z.number(),
    notes: z.string().optional(),
    variant: z.string().optional(),
  })).min(1),
  subtotal: z.number(),
  total: z.number(),
  paymentMethod: z.enum(["cash", "qrph"]),
  orderType: z.enum(["dine-in", "takeaway"]).default("dine-in"),
  tableNumber: z.string().optional().nullable(),
  orderNote: z.string().optional().nullable(),
  paymongoSourceId: z.string().optional().nullable(),
});
