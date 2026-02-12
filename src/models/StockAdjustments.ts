import { ObjectId } from 'mongodb';
import { 
  Unit, 
  getUnitCategory, 
  isValidUnit, 
  toValidUnit,
  formatQuantity,
  UnitCategory
} from '@/lib/unit-conversion';

export interface StockAdjustment {
  _id?: ObjectId;
  itemId: ObjectId;
  itemName: string;
  
  // Adjustment type
  type: 'restock' | 'usage' | 'waste' | 'correction' | 'deduction' | 'adjustment';
  
  // Converted quantity (in inventory base unit)
  quantity: number;
  unit: Unit; // Base unit (g, mL, pieces, cm)
  
  // Original quantity before conversion (for audit)
  originalQuantity?: number;
  originalUnit?: Unit;
  
  // Stock levels
  previousStock: number;
  newStock: number;
  
  // Metadata
  notes?: string;
  conversionNote?: string; // Human-readable conversion explanation
  
  // Reference
  reference?: {
    type: 'order' | 'manual' | 'return' | 'adjustment' | 'rollback';
    id?: string;
    number?: string;
  };
  
  // Transaction tracking
  transactionId?: string;
  performedBy: string;
  createdAt: Date;
}

export interface CreateStockAdjustmentInput {
  itemId: ObjectId;
  itemName: string;
  type: StockAdjustment['type'];
  quantity: number;
  unit: Unit;
  originalQuantity?: number;
  originalUnit?: Unit;
  previousStock: number;
  newStock: number;
  notes?: string;
  conversionNote?: string;
  reference?: StockAdjustment['reference'];
  transactionId?: string;
  performedBy?: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Validates if a string is a valid stock adjustment type
 */
export function isValidAdjustmentType(type: string): type is StockAdjustment['type'] {
  return ['restock', 'usage', 'waste', 'correction', 'deduction', 'adjustment'].includes(type);
}

/**
 * Safely convert string to adjustment type
 */
export function toAdjustmentType(type: string): StockAdjustment['type'] {
  if (isValidAdjustmentType(type)) {
    return type;
  }
  return 'adjustment'; // Default fallback
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a stock adjustment record with proper unit handling
 */
export function createStockAdjustment(
  data: CreateStockAdjustmentInput
): Omit<StockAdjustment, '_id'> {
  
  // Validate that the unit is valid
  if (!isValidUnit(data.unit)) {
    throw new Error(`Invalid unit: ${data.unit}`);
  }
  
  // Validate original unit if provided
  if (data.originalUnit && !isValidUnit(data.originalUnit)) {
    throw new Error(`Invalid original unit: ${data.originalUnit}`);
  }
  
  // Format quantities
  const formattedQuantity = formatQuantity(data.quantity, data.unit);
  const formattedPreviousStock = formatQuantity(data.previousStock, data.unit);
  const formattedNewStock = formatQuantity(data.newStock, data.unit);
  
  // Format original quantity if provided
  let formattedOriginalQuantity: number | undefined;
  if (data.originalQuantity !== undefined && data.originalUnit) {
    formattedOriginalQuantity = formatQuantity(data.originalQuantity, data.originalUnit);
  }
  
  // Build notes with conversion info if available
  let notes = data.notes || '';
  if (data.conversionNote) {
    notes = notes 
      ? `${notes} (${data.conversionNote})`
      : data.conversionNote;
  }
  
  return {
    itemId: data.itemId,
    itemName: data.itemName,
    type: data.type,
    quantity: formattedQuantity,
    unit: data.unit,
    originalQuantity: formattedOriginalQuantity,
    originalUnit: data.originalUnit,
    previousStock: formattedPreviousStock,
    newStock: formattedNewStock,
    notes: notes || undefined,
    conversionNote: data.conversionNote,
    reference: data.reference,
    transactionId: data.transactionId,
    performedBy: data.performedBy || 'system',
    createdAt: new Date()
  };
}

/**
 * Create a deduction adjustment (for orders)
 */
export function createDeductionAdjustment(
  itemId: ObjectId,
  itemName: string,
  quantity: number,
  unit: Unit,
  previousStock: number,
  newStock: number,
  options: {
    originalQuantity?: number;
    originalUnit?: Unit;
    orderId?: string;
    orderNumber?: string;
    transactionId?: string;
    notes?: string;
    conversionNote?: string;
    performedBy?: string;
  } = {}
): Omit<StockAdjustment, '_id'> {
  
  return createStockAdjustment({
    itemId,
    itemName,
    type: 'deduction',
    quantity,
    unit,
    originalQuantity: options.originalQuantity,
    originalUnit: options.originalUnit,
    previousStock,
    newStock,
    notes: options.notes,
    conversionNote: options.conversionNote,
    reference: {
      type: 'order',
      id: options.orderId,
      number: options.orderNumber
    },
    transactionId: options.transactionId,
    performedBy: options.performedBy || 'system'
  });
}

/**
 * Create a restock adjustment
 */
export function createRestockAdjustment(
  itemId: ObjectId,
  itemName: string,
  quantity: number,
  unit: Unit,
  previousStock: number,
  newStock: number,
  options: {
    supplier?: string;
    notes?: string;
    transactionId?: string;
    performedBy?: string;
  } = {}
): Omit<StockAdjustment, '_id'> {
  
  const notes = options.supplier 
    ? `Restocked from ${options.supplier}${options.notes ? `: ${options.notes}` : ''}`
    : options.notes;
  
  return createStockAdjustment({
    itemId,
    itemName,
    type: 'restock',
    quantity,
    unit,
    previousStock,
    newStock,
    notes,
    reference: {
      type: 'manual',
      id: options.transactionId
    },
    transactionId: options.transactionId,
    performedBy: options.performedBy || 'system'
  });
}

/**
 * Create a correction adjustment
 */
export function createCorrectionAdjustment(
  itemId: ObjectId,
  itemName: string,
  correctedStock: number,
  unit: Unit,
  previousStock: number,
  newStock: number,
  options: {
    reason?: string;
    notes?: string;
    transactionId?: string;
    performedBy?: string;
  } = {}
): Omit<StockAdjustment, '_id'> {
  
  const notes = options.reason 
    ? `Correction: ${options.reason}${options.notes ? ` - ${options.notes}` : ''}`
    : options.notes || 'Stock correction';
  
  return createStockAdjustment({
    itemId,
    itemName,
    type: 'correction',
    quantity: correctedStock,
    unit,
    previousStock,
    newStock,
    notes,
    reference: {
      type: 'adjustment',
      id: options.transactionId
    },
    transactionId: options.transactionId,
    performedBy: options.performedBy || 'system'
  });
}

/**
 * Create a waste adjustment
 */
export function createWasteAdjustment(
  itemId: ObjectId,
  itemName: string,
  quantity: number,
  unit: Unit,
  previousStock: number,
  newStock: number,
  options: {
    reason?: string;
    notes?: string;
    transactionId?: string;
    performedBy?: string;
  } = {}
): Omit<StockAdjustment, '_id'> {
  
  const notes = options.reason 
    ? `Waste: ${options.reason}${options.notes ? ` - ${options.notes}` : ''}`
    : options.notes || 'Recorded as waste';
  
  return createStockAdjustment({
    itemId,
    itemName,
    type: 'waste',
    quantity,
    unit,
    previousStock,
    newStock,
    notes,
    reference: {
      type: 'adjustment',
      id: options.transactionId
    },
    transactionId: options.transactionId,
    performedBy: options.performedBy || 'system'
  });
}

/**
 * Create a rollback adjustment
 */
export function createRollbackAdjustment(
  itemId: ObjectId,
  itemName: string,
  quantity: number,
  unit: Unit,
  previousStock: number,
  newStock: number,
  originalTransactionId: string,
  options: {
    notes?: string;
    performedBy?: string;
  } = {}
): Omit<StockAdjustment, '_id'> {
  
  return createStockAdjustment({
    itemId,
    itemName,
    type: 'correction',
    quantity,
    unit,
    previousStock,
    newStock,
    notes: options.notes || `Rollback of transaction ${originalTransactionId}`,
    reference: {
      type: 'rollback',
      id: originalTransactionId
    },
    transactionId: `rollback-${originalTransactionId}`,
    performedBy: options.performedBy || 'system'
  });
}

/**
 * Format stock adjustment for display
 */
export function formatAdjustmentForDisplay(adjustment: StockAdjustment): StockAdjustment & {
  displayQuantity: string;
  displayPreviousStock: string;
  displayNewStock: string;
  displayChange: string;
  displayTime: string;
} {
  const change = adjustment.newStock - adjustment.previousStock;
  const changeSign = change > 0 ? '+' : '';
  
  return {
    ...adjustment,
    displayQuantity: `${adjustment.quantity} ${adjustment.unit}`,
    displayPreviousStock: `${adjustment.previousStock} ${adjustment.unit}`,
    displayNewStock: `${adjustment.newStock} ${adjustment.unit}`,
    displayChange: `${changeSign}${change} ${adjustment.unit}`,
    displayTime: adjustment.createdAt.toLocaleString()
  };
}

/**
 * Group adjustments by transaction ID
 */
export function groupAdjustmentsByTransaction(
  adjustments: StockAdjustment[]
): Map<string, StockAdjustment[]> {
  const grouped = new Map<string, StockAdjustment[]>();
  
  adjustments.forEach(adj => {
    const txId = adj.transactionId || 'individual';
    if (!grouped.has(txId)) {
      grouped.set(txId, []);
    }
    grouped.get(txId)!.push(adj);
  });
  
  return grouped;
}

// Collection name constant
export const STOCK_ADJUSTMENT_COLLECTION = 'stockAdjustments';