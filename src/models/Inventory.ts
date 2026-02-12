import { ObjectId } from 'mongodb';
import { 
  Unit, 
  UnitCategory,
  getUnitCategory,
  isBaseUnit,
  getBaseUnit,
  normalizeToBaseUnit,
  formatQuantity,
  areUnitsCompatible,
  hasDensity,
  ingredientDensities,
  Unit as ValidUnit  // Alias to avoid confusion
} from '@/lib/unit-conversion';

export interface Inventory {
  _id?: ObjectId;
  name: string;
  category: string;
  
  // Stock levels - ALWAYS stored in base units (g, mL, pieces, cm)
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  
  // Unit information
  unit: ValidUnit;              // Base unit (g, mL, pieces, cm)
  displayUnit: ValidUnit;       // Original unit for display (kg, L, tsp, etc)
  unitCategory: UnitCategory;   // Weight, volume, count, length
  
  // Optional density for weight/volume ingredients
  density?: number;            // g/mL, only needed if converting between weight and volume
  
  // Other fields
  supplier: string;
  lastRestocked: Date;
  pricePerUnit: number;        // Price per display unit (not base unit!)
  location: string;
  icon: string;
  status: 'critical' | 'low' | 'warning' | 'ok';
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for creating/updating inventory items with display units
export interface InventoryInput {
  name: string;
  category: string;
  currentStock: number;
  currentStockUnit: ValidUnit;      // The unit user entered (kg, L, tsp, etc)
  minStock: number;
  minStockUnit: ValidUnit;
  maxStock?: number;
  maxStockUnit?: ValidUnit;
  reorderPoint?: number;
  reorderPointUnit?: ValidUnit;
  unit: ValidUnit;                 // Display unit
  supplier?: string;
  pricePerUnit?: number;
  location?: string;
  icon?: string;
  density?: number;          // Optional, for weight/volume items
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to validate if a string is a valid Unit
 */
export function isValidUnit(unit: string): unit is ValidUnit {
  return getUnitCategory(unit) !== null;
}

/**
 * Safely convert string to Unit or throw error
 */
export function toValidUnit(unit: string, fieldName: string): ValidUnit {
  if (isValidUnit(unit)) {
    return unit;
  }
  throw new Error(`Invalid unit "${unit}" for field ${fieldName}`);
}

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Normalize inventory item to base units
 */
export function normalizeInventoryItem(input: InventoryInput): Omit<Inventory, '_id'> {
  const now = new Date();
  
  // Determine unit category
  const unitCategory = getUnitCategory(input.unit);
  if (!unitCategory) {
    throw new Error(`Unknown unit: ${input.unit}`);
  }
  
  // Get base unit for this category
  const baseUnit = getBaseUnit(unitCategory) as ValidUnit;
  
  // Normalize all stock values to base units
  const currentStock = normalizeToBaseUnit(input.currentStock, input.currentStockUnit).quantity;
  const minStock = normalizeToBaseUnit(input.minStock, input.minStockUnit).quantity;
  
  // Handle optional fields
  let maxStock: number;
  if (input.maxStock !== undefined && input.maxStockUnit) {
    maxStock = normalizeToBaseUnit(input.maxStock, input.maxStockUnit).quantity;
  } else {
    // Default: 3x minStock in base units
    maxStock = minStock * 3;
  }
  
  let reorderPoint: number;
  if (input.reorderPoint !== undefined && input.reorderPointUnit) {
    reorderPoint = normalizeToBaseUnit(input.reorderPoint, input.reorderPointUnit).quantity;
  } else {
    // Default: 1.5x minStock in base units
    reorderPoint = Math.ceil(minStock * 1.5);
  }
  
  // Calculate status
  const status = calculateInventoryStatus(currentStock, reorderPoint, minStock);
  
  // Price is per display unit, not base unit
  const pricePerUnit = input.pricePerUnit || 0;
  
  return {
    name: input.name,
    category: input.category,
    
    // Stored in base units
    currentStock: formatQuantity(currentStock, baseUnit),
    minStock: formatQuantity(minStock, baseUnit),
    maxStock: formatQuantity(maxStock, baseUnit),
    reorderPoint: formatQuantity(reorderPoint, baseUnit),
    
    // Unit information - explicitly cast to ValidUnit
    unit: baseUnit,
    displayUnit: input.unit,
    unitCategory,
    
    // Density for weight/volume conversions
    density: input.density,
    
    // Other fields
    supplier: input.supplier || 'Unknown',
    lastRestocked: now,
    pricePerUnit,
    location: input.location || 'Unassigned',
    icon: input.icon || 'package',
    status,
    
    // Timestamps
    createdAt: now,
    updatedAt: now
  };
}

// ============================================================================
// STATUS CALCULATION
// ============================================================================

/**
 * Calculate inventory status based on stock levels
 */
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

// ============================================================================
// CREATE INVENTORY ITEM (Legacy support)
// ============================================================================

/**
 * Legacy function - Use normalizeInventoryItem instead
 * @deprecated Use normalizeInventoryItem with proper units
 */
export function createInventoryItem(data: Partial<Inventory>): Omit<Inventory, '_id'> {
  console.warn('Deprecated: Use normalizeInventoryItem instead');
  
  const now = new Date();
  const minStock = data.minStock || 10;
  const unit = data.unit || 'pieces';
  
  // Validate and convert unit
  const validUnit = isValidUnit(unit) ? unit : 'pieces' as ValidUnit;
  const unitCategory = getUnitCategory(validUnit) || 'count';
  const baseUnit = getBaseUnit(unitCategory) as ValidUnit;
  
  return {
    name: data.name || '',
    category: data.category || '',
    currentStock: data.currentStock || 0,
    minStock: minStock,
    maxStock: data.maxStock || minStock * 3,
    unit: baseUnit,
    displayUnit: validUnit,
    unitCategory,
    density: data.density,
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

// ============================================================================
// UPDATE INVENTORY ITEM
// ============================================================================

/**
 * Update inventory item with proper unit handling
 */
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

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Convert base unit quantity back to display unit
 */
export function toDisplayUnit(
  quantity: number,
  fromBaseUnit: string,
  toDisplayUnit: string
): number {
  try {
    // Validate units
    if (!isValidUnit(fromBaseUnit) || !isValidUnit(toDisplayUnit)) {
      return quantity;
    }
    
    const validFromUnit = fromBaseUnit as ValidUnit;
    const validToUnit = toDisplayUnit as ValidUnit;
    
    // Convert from base unit (g, mL, pieces, cm) to display unit
    const conversions: Record<string, Record<string, number>> = {
      'g': {
        'kg': 0.001,
        'g': 1,
        'lb': 0.00220462,
        'oz': 0.035274
      },
      'mL': {
        'L': 0.001,
        'mL': 1,
        'tsp': 0.202884,
        'tbsp': 0.067628,
        'cup': 0.00422675,
        'fl_oz': 0.033814,
        'gal': 0.000264172
      },
      'pieces': {
        'pieces': 1,
        'boxes': 1,
        'bottles': 1,
        'bags': 1
      },
      'cm': {
        'm': 0.01,
        'cm': 1,
        'inch': 0.393701,
        'ft': 0.0328084
      }
    };
    
    const conversion = conversions[validFromUnit]?.[validToUnit];
    if (conversion) {
      return formatQuantity(quantity * conversion, validToUnit);
    }
    
    // If no direct conversion, try through unit-conversion lib
    const { convertUnit } = require('@/lib/unit-conversion');
    return convertUnit(quantity, validFromUnit, validToUnit);
  } catch (error) {
    console.warn(`Failed to convert ${quantity}${fromBaseUnit} to ${toDisplayUnit}:`, error);
    return quantity;
  }
}

/**
 * Format inventory item for display
 */
export function formatInventoryForDisplay(item: Inventory): Inventory & {
  displayStock: string;
  displayMinStock: string;
  displayMaxStock: string;
  displayReorderPoint: string;
} {
  return {
    ...item,
    displayStock: `${toDisplayUnit(item.currentStock, item.unit, item.displayUnit)} ${item.displayUnit}`,
    displayMinStock: `${toDisplayUnit(item.minStock, item.unit, item.displayUnit)} ${item.displayUnit}`,
    displayMaxStock: `${toDisplayUnit(item.maxStock, item.unit, item.displayUnit)} ${item.displayUnit}`,
    displayReorderPoint: `${toDisplayUnit(item.reorderPoint, item.unit, item.displayUnit)} ${item.displayUnit}`
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that recipe ingredients are compatible with inventory item
 */
export function validateIngredientCompatibility(
  inventoryItem: Inventory,
  ingredientUnit: string,
  ingredientName: string
): { valid: boolean; error?: string } {
  // Validate ingredient unit
  if (!isValidUnit(ingredientUnit)) {
    return {
      valid: false,
      error: `Unknown unit in recipe: ${ingredientUnit}`
    };
  }
  
  const validIngredientUnit = ingredientUnit as ValidUnit;
  const inventoryCategory = inventoryItem.unitCategory;
  const ingredientCategory = getUnitCategory(validIngredientUnit);
  
  if (!ingredientCategory) {
    return {
      valid: false,
      error: `Unknown unit in recipe: ${ingredientUnit}`
    };
  }
  
  // Same category - always valid
  if (inventoryCategory === ingredientCategory) {
    return { valid: true };
  }
  
  // Different categories - need density
  if (inventoryCategory === 'weight' && ingredientCategory === 'volume') {
    if (inventoryItem.density || hasDensity(ingredientName)) {
      return { valid: true };
    }
    return {
      valid: false,
      error: `Cannot convert weight to volume for ${ingredientName}. Please add density data.`
    };
  }
  
  if (inventoryCategory === 'volume' && ingredientCategory === 'weight') {
    if (inventoryItem.density || hasDensity(ingredientName)) {
      return { valid: true };
    }
    return {
      valid: false,
      error: `Cannot convert volume to weight for ${ingredientName}. Please add density data.`
    };
  }
  
  return {
    valid: false,
    error: `Cannot convert ${ingredientCategory} to ${inventoryCategory}`
  };
}

// Collection name constant
export const INVENTORY_COLLECTION = 'inventory';