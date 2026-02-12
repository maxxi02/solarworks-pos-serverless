// Existing InventoryItem type
export interface InventoryItem {
  _id?: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: 'pieces' | 'kg' | 'g' | 'L' | 'mL' | 'boxes' | 'bottles' | 'bags';
  supplier: string;
  lastRestocked: Date;
  pricePerUnit: number;
  location: string;
  reorderPoint: number;
  icon: string;
  status: 'critical' | 'low' | 'warning' | 'ok';
  createdAt?: Date;
  updatedAt?: Date;
}

// Stock adjustment types
export interface StockAdjustment {
  type: 'restock' | 'usage' | 'waste' | 'correction' | 'deduction';
  quantity: number;
  notes?: string;
  performedBy: string;
  reference?: {
    type: 'order' | 'manual' | 'return' | 'adjustment';
    id?: string;
    number?: string;
  };
}

// Batch stock adjustment for orders
export interface BatchStockAdjustment {
  itemId: string;
  itemName: string;
  quantity: number;
  type: 'deduction' | 'restock';
  unit: string;
  notes?: string;
}

// Stock check result
export interface StockCheckResult {
  itemId: string;
  name: string;
  available: boolean;
  currentStock: number;
  requiredQuantity: number;
  insufficient?: boolean;
  shortBy?: number;
  unit: string;
  status?: 'critical' | 'low' | 'warning' | 'ok';
}

// Batch adjustment result with rollback support
export interface BatchAdjustmentResult {
  success: boolean;
  transactionId: string;
  successful: Array<{
    itemId: string;
    name: string;
    newStock: number;
    status: string;
    previousStock: number;
  }>;
  failed: Array<{
    itemId: string;
    name: string;
    error: string;
    requestedQuantity: number;
    availableStock?: number;
  }>;
  rollbackPerformed?: boolean;
  timestamp: Date;
}

// Order inventory connection
export interface OrderInventoryDeduction {
  orderId: string;
  orderNumber: string;
  transactionId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    ingredientDeductions: Array<{
      ingredientName: string;
      quantity: number;
      unit: string;
      stockItemId: string;
      beforeStock: number;
      afterStock: number;
    }>;
  }>;
  status: 'pending' | 'completed' | 'failed' | 'rolled_back';
  timestamp: Date;
  completedAt?: Date;
  rolledBackAt?: Date;
}

// Low stock alert
export interface LowStockAlert {
  itemId: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  unit: string;
  status: 'critical' | 'low' | 'warning';
  location: string;
  supplier: string;
  lastRestocked: Date;
  daysUntilReorder?: number;
}