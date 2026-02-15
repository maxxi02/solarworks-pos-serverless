// types/receipt.ts
export interface Receipt {
  orderNumber: string;
  customerName: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    hasDiscount?: boolean;
    category?: string;
    menuType?: 'food' | 'drink';
    notes?: string;
  }>;
  subtotal: number;
  discountTotal: number;
  total: number;
  taxAmount: number;
  paymentMethod: 'cash' | 'gcash' | 'split';
  splitPayment?: { cash: number; gcash: number };
  orderType: 'dine-in' | 'takeaway';
  tableNumber?: string;
  orderNote?: string;
  seniorPwdCount?: number;
  seniorPwdIds?: string[];
  cashier: string;
  cashierId?: string;
  customerReceiptPrinted?: boolean;
  kitchenReceiptPrinted?: boolean;
  reprintCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// For API responses (without _id)
export type ReceiptResponse = Omit<Receipt, '_id'>;