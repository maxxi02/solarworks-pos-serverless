// File: /lib/inventoryConnectionService.ts
import { ProductIngredient } from '@/components/forms/ProductIngredientsForm';

export interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
  pricePerUnit: number;
  supplier?: string;
  status: string;
}

/**
 * Check if all ingredients are available in inventory
 */
export async function checkIngredientsAvailability(
  ingredients: ProductIngredient[],
  inventoryItems: InventoryItem[]
): Promise<{
  available: boolean;
  missingIngredients: Array<{
    name: string;
    required: number;
    available: number;
    unit: string;
  }>;
}> {
  const missingIngredients: Array<{
    name: string;
    required: number;
    available: number;
    unit: string;
  }> = [];

  for (const ingredient of ingredients) {
    const inventoryItem = inventoryItems.find(item => item._id === ingredient.inventoryItemId);

    if (!inventoryItem) {
      missingIngredients.push({
        name: ingredient.name,
        required: ingredient.quantity,
        available: 0,
        unit: ingredient.unit
      });
      continue;
    }

    // Convert quantity to inventory item's unit
    const requiredAmount = convertQuantity(ingredient.quantity, ingredient.unit, inventoryItem.unit);
    
    if (inventoryItem.currentStock < requiredAmount) {
      missingIngredients.push({
        name: ingredient.name,
        required: requiredAmount,
        available: inventoryItem.currentStock,
        unit: inventoryItem.unit
      });
    }
  }

  return {
    available: missingIngredients.length === 0,
    missingIngredients
  };
}

/**
 * Deduct ingredients from inventory when a product is sold
 */
export async function deductIngredientsFromInventory(
  ingredients: ProductIngredient[],
  quantity: number, // Number of product servings sold
  inventoryItems: InventoryItem[]
): Promise<{
  success: boolean;
  deductedItems: Array<{
    inventoryItemId: string;
    name: string;
    quantityDeducted: number;
    newStock: number;
  }>;
  errors: string[];
}> {
  const deductedItems = [];
  const errors = [];

  for (const ingredient of ingredients) {
    const inventoryItem = inventoryItems.find(item => item._id === ingredient.inventoryItemId);

    if (!inventoryItem) {
      errors.push(`Inventory item not found: ${ingredient.name}`);
      continue;
    }

    // Calculate total required amount
    const requiredAmount = convertQuantity(
      ingredient.quantity * quantity,
      ingredient.unit,
      inventoryItem.unit
    );
    
    if (inventoryItem.currentStock < requiredAmount) {
      errors.push(`Insufficient stock for ${ingredient.name}. Required: ${requiredAmount.toFixed(2)}, Available: ${inventoryItem.currentStock.toFixed(2)} ${inventoryItem.unit}`);
      continue;
    }

    // Calculate new stock
    const newStock = inventoryItem.currentStock - requiredAmount;
    
    deductedItems.push({
      inventoryItemId: inventoryItem._id,
      name: ingredient.name,
      quantityDeducted: requiredAmount,
      newStock: newStock
    });
  }

  return {
    success: errors.length === 0,
    deductedItems,
    errors
  };
}

/**
 * Convert quantity between units
 */
function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  // Simple conversion mapping (you can expand this)
  const conversionRates: Record<string, Record<string, number>> = {
    'g': { 'kg': 0.001, 'g': 1, 'oz': 0.035274 },
    'kg': { 'g': 1000, 'kg': 1, 'oz': 35.274 },
    'oz': { 'g': 28.3495, 'kg': 0.02835, 'oz': 1 },
    'ml': { 'L': 0.001, 'ml': 1, 'cups': 0.00422675 },
    'L': { 'ml': 1000, 'L': 1, 'cups': 4.22675 },
    'cups': { 'ml': 236.588, 'L': 0.2366, 'cups': 1 },
    'pieces': { 'pieces': 1 }
  };

  // Default to 1:1 if no conversion found
  if (!conversionRates[fromUnit] || !conversionRates[fromUnit][toUnit]) {
    console.warn(`No conversion rate found from ${fromUnit} to ${toUnit}. Using 1:1 ratio.`);
    return quantity;
  }

  return quantity * conversionRates[fromUnit][toUnit];
}

/**
 * Get low stock warnings for products
 */
export function getLowStockWarnings(
  ingredients: ProductIngredient[],
  inventoryItems: InventoryItem[]
): Array<{
  productName: string;
  ingredientName: string;
  currentStock: number;
  minStock: number;
  unit: string;
}> {
  const warnings = [];

  for (const ingredient of ingredients) {
    const inventoryItem = inventoryItems.find(item => item._id === ingredient.inventoryItemId);
    
    if (inventoryItem && inventoryItem.currentStock <= inventoryItem.minStock) {
      warnings.push({
        productName: ingredient.name,
        ingredientName: inventoryItem.name,
        currentStock: inventoryItem.currentStock,
        minStock: inventoryItem.minStock,
        unit: inventoryItem.unit
      });
    }
  }

  return warnings;
}