
export interface InventoryItem {
  _id?: string;
  name: string;
  description?: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: 'kg' | 'g' | 'L' | 'mL' | 'pieces' | 'boxes' | 'bottles' | 'bags';
  status: 'critical' | 'low' | 'warning' | 'ok';
  supplier: string;
  lastRestocked: Date;
  pricePerUnit: number;
  location: string;
  reorderPoint: number;
  icon: 'coffee' | 'utensils' | 'package' | 'milk' | 'syrup';
  createdAt: Date;
  updatedAt: Date;
}

export interface StockAdjustment {
  _id?: string;
  itemId: string;
  itemName: string;
  type: 'restock' | 'usage' | 'waste' | 'correction';
  quantity: number;
  unit: string;
  date: Date;
  notes: string;
  performedBy: string;
  previousStock: number;
  newStock: number;
  createdAt: Date;
}