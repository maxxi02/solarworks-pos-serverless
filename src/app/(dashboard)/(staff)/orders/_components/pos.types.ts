// ============ Shared Types ============

// ── Add-on types (mirrored from src/types/products.ts) ──
export interface AddonItem {
  name: string;
  price: number;
}

export interface AddonGroup {
  _id?: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  items: AddonItem[];
}

export interface SelectedAddon {
  groupName: string;
  addonName: string;
  price: number;
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  description?: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  available: boolean;
  category?: string;
  menuType?: "food" | "drink";
  imageUrl?: string;
  addonGroups?: AddonGroup[];
  isCookable?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  notes?: string;
  hasDiscount?: boolean;
  /** Addons selected for this specific cart line item */
  selectedAddons?: SelectedAddon[];
  /** Base price + sum of selected addon prices. Used for subtotal calculations. */
  effectivePrice?: number;
  /** Unique key for deduplication: _id + sorted addon names (allows same product with diff addons) */
  cartKey?: string;
}

export interface CategoryData {
  products?: Product[];
  name: string;
  menuType: "food" | "drink";
}

export interface SavedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: "cash" | "gcash" | "split";
  splitPayment?: { cash: number; gcash: number };
  orderType: "dine-in" | "takeaway";
  tableNumber?: string;
  timestamp: Date;
  status: "pending" | "completed" | "cancelled" | "refunded" | "voided";
  seniorPwdCount?: number;
  orderNote?: string;
  cashier?: string;
  cashierId?: string;
  seniorPwdIds?: string[];
  amountPaid?: number;
  change?: number;
}

export interface StockAlert {
  itemId: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  unit: string;
  status: "critical" | "low" | "warning";
  location: string;
  outOfStock?: boolean;
}

export interface InsufficientStockItem {
  name: string;
  requiredQuantity: number;
  currentStock: number;
  unit: string;
  shortBy: number;
}

export interface StockCheckResult {
  name: string;
  requiredQuantity: number;
  currentStock: number;
  unit: string;
  shortBy?: number;
}

export interface ReceiptOrder extends SavedOrder {
  cashier?: string;
  seniorPwdIds?: string[];
  isReprint?: boolean;
}
