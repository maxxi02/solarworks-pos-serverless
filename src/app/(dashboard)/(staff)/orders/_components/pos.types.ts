// ============ Shared Types ============

export interface Product {
  _id: string;
  name: string;
  price: number;
  description?: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  available: boolean;
  category?: string;
  menuType?: 'food' | 'drink';
}

export interface CartItem extends Product {
  quantity: number;
  notes?: string;
  hasDiscount?: boolean;
}

export interface CategoryData {
  products?: Product[];
  name: string;
  menuType: 'food' | 'drink';
}

export interface SavedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: 'cash' | 'gcash' | 'split';
  splitPayment?: { cash: number; gcash: number };
  orderType: 'dine-in' | 'takeaway';
  tableNumber?: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled';
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
  status: 'critical' | 'low' | 'warning';
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