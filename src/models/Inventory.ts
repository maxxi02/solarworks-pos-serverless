import { ObjectId } from 'mongodb';

export interface Inventory {
  _id?: ObjectId;
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

// Helper function to calculate status based on stock levels
export function calculateInventoryStatus(
  currentStock: number, 
  reorderPoint: number, 
  minStock: number
): 'critical' | 'low' | 'warning' | 'ok' {
  if (currentStock <= 0) {
    return 'critical';
  } else if (currentStock <= reorderPoint) {
    return 'low';
  } else if (currentStock <= minStock) {
    return 'warning';
  } else {
    return 'ok';
  }
}

// Helper function to create a new inventory item with default values
export function createInventoryItem(data: Partial<Inventory>): Omit<Inventory, '_id'> {
  const now = new Date();
  const minStock = data.minStock || 10;
  
  return {
    name: data.name || '',
    category: data.category || '',
    currentStock: data.currentStock || 0,
    minStock: minStock,
    maxStock: data.maxStock || minStock * 3,
    unit: data.unit || 'pieces',
    supplier: data.supplier || 'Unknown',
    lastRestocked: data.lastRestocked || now,
    pricePerUnit: data.pricePerUnit || 0,
    location: data.location || 'Unassigned',
    reorderPoint: data.reorderPoint || Math.ceil(minStock * 1.5),
    icon: data.icon || 'package',
    status: calculateInventoryStatus(
      data.currentStock || 0,
      data.reorderPoint || Math.ceil(minStock * 1.5),
      minStock
    ),
    createdAt: now,
    updatedAt: now
  };
}

// Helper function to update inventory item with new status calculation
export function updateInventoryItem(
  existing: Inventory, 
  updates: Partial<Inventory>
): Partial<Inventory> {
  const updatedData = { ...updates };
  
  // If stock changed, recalculate status
  if (updates.currentStock !== undefined) {
    const reorderPoint = updates.reorderPoint ?? existing.reorderPoint;
    const minStock = updates.minStock ?? existing.minStock;
    
    updatedData.status = calculateInventoryStatus(
      updates.currentStock,
      reorderPoint,
      minStock
    );
    
    // Update lastRestocked if restocking
    if (updates.currentStock > existing.currentStock) {
      updatedData.lastRestocked = new Date();
    }
  }
  
  updatedData.updatedAt = new Date();
  
  return updatedData;
}

// Collection name constant
export const INVENTORY_COLLECTION = 'inventory';