const { z } = require("zod");

// Replicate PaymentMethodSchema
const PaymentMethodSchema = z.enum(["cash", "gcash", "split", "card"]);

// Replicate CreatePaymentSchema
const CreatePaymentSchema = z.object({
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

// Mock payload for GCash (the one that was failing 400)
const failingPayload = {
  orderNumber: "ORD-12345",
  orderId: "id-123",
  customerName: "Test User",
  items: [{ productId: "p1", name: "Item 1", price: 100, quantity: 1 }],
  subtotal: 100,
  discountTotal: 0,
  total: 100,
  paymentMethod: "gcash",
  amountPaid: undefined, // Fails here: z.number()
  change: undefined,    // Fails here: z.number()
};

// Fixed payload (after my usePOS.ts changes)
const fixedPayload = {
  orderNumber: "ORD-12345",
  orderId: "id-123",
  customerName: "Test User",
  items: [{ productId: "p1", name: "Item 1", price: 100, quantity: 1 }],
  subtotal: 100,
  discountTotal: 0,
  total: 100,
  paymentMethod: "gcash",
  amountPaid: 100, // Now total
  change: 0,       // Now 0
};

console.log("Validating failing payload...");
const failResult = CreatePaymentSchema.safeParse(failingPayload);
console.log("Success:", failResult.success);
if (!failResult.success) console.log("Errors:", JSON.stringify(failResult.error.format(), null, 2));

console.log("\nValidating fixed payload...");
const fixResult = CreatePaymentSchema.safeParse(fixedPayload);
console.log("Success:", fixResult.success);
if (!fixResult.success) console.log("Errors:", JSON.stringify(fixResult.error.format(), null, 2));
