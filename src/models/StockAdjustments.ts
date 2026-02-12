import { ObjectId } from 'mongodb';

export interface StockAdjustment {
  _id?: ObjectId;
  itemId: ObjectId;
  itemName: string;
  type: 'restock' | 'usage' | 'waste' | 'correction' | 'deduction' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  unit: string;
  notes?: string;
  reference?: {
    type: 'order' | 'manual' | 'return' | 'adjustment' | 'rollback';
    id?: string;
    number?: string;
  };
  transactionId?: string;
  performedBy: string;
  createdAt: Date;
}

// Helper function to create a stock adjustment record
export function createStockAdjustment(data: Partial<StockAdjustment>): Omit<StockAdjustment, '_id'> {
  return {
    itemId: data.itemId || new ObjectId(),
    itemName: data.itemName || '',
    type: data.type || 'adjustment',
    quantity: data.quantity || 0,
    previousStock: data.previousStock || 0,
    newStock: data.newStock || 0,
    unit: data.unit || 'pieces',
    notes: data.notes,
    reference: data.reference,
    transactionId: data.transactionId,
    performedBy: data.performedBy || 'system',
    createdAt: new Date()
  };
}

// Collection name constant
export const STOCK_ADJUSTMENT_COLLECTION = 'stockAdjustments';