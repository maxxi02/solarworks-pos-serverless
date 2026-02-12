import { useState, useCallback } from 'react';
import { 
  batchAdjustStock, 
  checkStockAvailability, 
  rollbackTransaction,
  getInventoryByNames
} from '@/lib/inventoryService';
import { 
  BatchAdjustmentResult, 
  StockCheckResult, 
  BatchStockAdjustment 
} from '@/types';
import { 
  Unit,
  smartConvert,
  areUnitsCompatible,
  hasDensity,
  formatQuantity,
  getUnitCategory,
  UnitCategory
} from '@/lib/unit-conversion';
import { toast } from 'sonner';

interface ProductIngredient {
  name: string;
  quantity: string;
  unit: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  ingredients: ProductIngredient[];
}

interface IngredientRequirement {
  name: string;
  quantity: number;
  unit: Unit;
  originalQuantity: number;
  originalUnit: Unit;
}

interface StockCheckWithConversion {
  itemId?: string;
  itemName: string;
  quantity: number;
  unit: Unit;
  originalQuantity?: number;
  originalUnit?: Unit;
  conversionNote?: string;
  skip?: boolean;
  error?: string;
}

interface UseInventoryOrderOptions {
  onSuccess?: (result: BatchAdjustmentResult) => void;
  onError?: (error: Error) => void;
  onInsufficientStock?: (insufficientItems: StockCheckResult[]) => void;
  onUnitMismatch?: (mismatches: Array<{ ingredient: string; recipeUnit: string; inventoryUnit: string; message: string }>) => void;
  autoRollback?: boolean;
  strictUnitCheck?: boolean;
}

export function useInventoryOrder(options: UseInventoryOrderOptions = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [stockCheckResults, setStockCheckResults] = useState<StockCheckResult[]>([]);
  const [insufficientItems, setInsufficientItems] = useState<StockCheckResult[]>([]);
  const [unitMismatches, setUnitMismatches] = useState<Array<{
    ingredient: string;
    recipeUnit: string;
    inventoryUnit: string;
    message: string;
  }>>([]);

  const flattenIngredientRequirements = useCallback((items: OrderItem[]): Map<string, IngredientRequirement> => {
    const requirements = new Map<string, IngredientRequirement>();
    
    items.forEach(item => {
      item.ingredients?.forEach(ingredient => {
        const requiredQty = parseFloat(ingredient.quantity) * item.quantity;
        const key = ingredient.name;
        
        if (requirements.has(key)) {
          const current = requirements.get(key)!;
          current.quantity += requiredQty;
        } else {
          requirements.set(key, {
            name: ingredient.name,
            quantity: requiredQty,
            unit: ingredient.unit as Unit,
            originalQuantity: requiredQty,
            originalUnit: ingredient.unit as Unit
          });
        }
      });
    });
    
    return requirements;
  }, []);

  const validateUnits = useCallback((
    requirements: Map<string, IngredientRequirement>,
    inventoryMap: Map<string, any>
  ): {
    valid: boolean;
    mismatches: Array<{ ingredient: string; recipeUnit: string; inventoryUnit: string; message: string }>;
  } => {
    const mismatches = [];
    
    for (const [name, requirement] of requirements.entries()) {
      const inventoryItem = inventoryMap.get(name);
      
      if (!inventoryItem) {
        mismatches.push({
          ingredient: name,
          recipeUnit: requirement.unit,
          inventoryUnit: 'N/A',
          message: `No inventory item found for ${name}`
        });
        continue;
      }
      
      const recipeUnit = requirement.unit;
      const inventoryUnit = inventoryItem.displayUnit || inventoryItem.unit;
      
      if (!areUnitsCompatible(recipeUnit, inventoryUnit)) {
        const recipeCategory = getUnitCategory(recipeUnit);
        const inventoryCategory = getUnitCategory(inventoryUnit);
        
        if (options.strictUnitCheck) {
          mismatches.push({
            ingredient: name,
            recipeUnit,
            inventoryUnit,
            message: `Cannot convert ${recipeUnit} (${recipeCategory}) to ${inventoryUnit} (${inventoryCategory}). Please use same unit type.`
          });
          continue;
        }
        
        if ((recipeCategory === 'weight' && inventoryCategory === 'volume') ||
            (recipeCategory === 'volume' && inventoryCategory === 'weight')) {
          
          if (!hasDensity(name) && !inventoryItem.density) {
            mismatches.push({
              ingredient: name,
              recipeUnit,
              inventoryUnit,
              message: `Cannot convert ${recipeUnit} to ${inventoryUnit}. No density data for ${name}.`
            });
          }
        } else {
          mismatches.push({
            ingredient: name,
            recipeUnit,
            inventoryUnit,
            message: `Cannot convert ${recipeUnit} (${recipeCategory}) to ${inventoryUnit} (${inventoryCategory}).`
          });
        }
      }
    }
    
    return {
      valid: mismatches.length === 0,
      mismatches
    };
  }, [options.strictUnitCheck]);

  const convertToInventoryUnit = useCallback((
    quantity: number,
    fromUnit: Unit,
    inventoryItem: any
  ): { quantity: number; unit: Unit; conversionNote?: string } => {
    try {
      const inventoryUnit = inventoryItem.unit as Unit;
      
      if (fromUnit === inventoryUnit) {
        return {
          quantity: formatQuantity(quantity, inventoryUnit),
          unit: inventoryUnit
        };
      }
      
      const converted = smartConvert(
        quantity,
        fromUnit,
        inventoryUnit,
        inventoryItem.name
      );
      
      const formattedQuantity = formatQuantity(converted, inventoryUnit);
      
      return {
        quantity: formattedQuantity,
        unit: inventoryUnit,
        conversionNote: `${quantity} ${fromUnit} = ${formattedQuantity} ${inventoryUnit}`
      };
    } catch (error) {
      console.error(`Conversion failed for ${inventoryItem?.name}:`, error);
      throw error;
    }
  }, []);

  const checkOrderStock = useCallback(async (
    items: OrderItem[]
  ): Promise<{
    allAvailable: boolean;
    results: StockCheckResult[];
    insufficientItems: StockCheckResult[];
    unitMismatches: typeof unitMismatches;
  }> => {
    setIsChecking(true);
    setUnitMismatches([]);
    
    try {
      const requirements = flattenIngredientRequirements(items);
      const ingredientNames = Array.from(requirements.keys());
      
      // ✅ Get inventory items - should be a plain array now
      const inventoryItems = await getInventoryByNames(ingredientNames);
      
      // ✅ Ensure we have an array
      const itemsArray = Array.isArray(inventoryItems) ? inventoryItems : [];
      
      // ✅ Create map from the array
      const inventoryMap = new Map(itemsArray.map(item => [item.name, item]));
      
      const unitValidation = validateUnits(requirements, inventoryMap);
      setUnitMismatches(unitValidation.mismatches);
      
      if (!unitValidation.valid && options.onUnitMismatch) {
        options.onUnitMismatch(unitValidation.mismatches);
      }
      
      if (options.strictUnitCheck && !unitValidation.valid) {
        throw new Error('Unit compatibility check failed');
      }

      const stockChecks: StockCheckWithConversion[] = [];
      
      for (const [name, requirement] of requirements.entries()) {
        const inventoryItem = inventoryMap.get(name);
        
        if (!inventoryItem) {
          stockChecks.push({
            itemName: name,
            quantity: requirement.quantity,
            unit: requirement.unit,
            skip: true,
            error: 'Item not found in inventory'
          });
          continue;
        }
        
        try {
          const converted = convertToInventoryUnit(
            requirement.quantity,
            requirement.unit,
            inventoryItem
          );
          
          // Convert ObjectId to string
          const itemId = inventoryItem._id?.toString();
          
          stockChecks.push({
            itemId,
            itemName: name,
            quantity: converted.quantity,
            unit: converted.unit,
            originalQuantity: requirement.quantity,
            originalUnit: requirement.unit,
            conversionNote: converted.conversionNote
          });
        } catch (error) {
          stockChecks.push({
            itemName: name,
            quantity: requirement.quantity,
            unit: requirement.unit,
            skip: true,
            error: error instanceof Error ? error.message : 'Conversion failed'
          });
        }
      }

      const validStockChecks = stockChecks
        .filter(check => !check.skip)
        .map(check => ({
          itemName: check.itemName,
          quantity: check.quantity,
          unit: check.unit
        }));

      const result = await checkStockAvailability(validStockChecks);
      
      const enhancedResults = result.results.map(res => {
        const check = stockChecks.find(c => c.itemName === res.name);
        return {
          ...res,
          originalQuantity: check?.originalQuantity,
          originalUnit: check?.originalUnit,
          conversionNote: check?.conversionNote
        } as StockCheckResult;
      });
      
      const enhancedInsufficient = result.insufficientItems.map(res => {
        const check = stockChecks.find(c => c.itemName === res.name);
        return {
          ...res,
          originalQuantity: check?.originalQuantity,
          originalUnit: check?.originalUnit,
          conversionNote: check?.conversionNote
        } as StockCheckResult;
      });
      
      setStockCheckResults(enhancedResults);
      setInsufficientItems(enhancedInsufficient);
      
      if (!result.allAvailable && options.onInsufficientStock) {
        options.onInsufficientStock(enhancedInsufficient);
      }
      
      return {
        allAvailable: result.allAvailable,
        results: enhancedResults,
        insufficientItems: enhancedInsufficient,
        unitMismatches: unitValidation.mismatches
      };
      
    } catch (error) {
      console.error('Error checking stock:', error);
      throw error;
    } finally {
      setIsChecking(false);
    }
  }, [flattenIngredientRequirements, validateUnits, convertToInventoryUnit, options]);

  const processOrderDeductions = useCallback(async (
    orderId: string,
    orderNumber: string,
    items: OrderItem[]
  ): Promise<BatchAdjustmentResult> => {
    setIsProcessing(true);
    
    try {
      const stockCheck = await checkOrderStock(items);
      
      if (!stockCheck.allAvailable) {
        const error = new Error('Insufficient stock for some ingredients');
        (error as any).insufficientItems = stockCheck.insufficientItems;
        (error as any).unitMismatches = stockCheck.unitMismatches;
        throw error;
      }

      const allIngredientNames = new Set<string>();
      items.forEach(item => {
        item.ingredients?.forEach(ingredient => {
          allIngredientNames.add(ingredient.name);
        });
      });

      // ✅ Get inventory items - should be a plain array now
      const inventoryItems = await getInventoryByNames(Array.from(allIngredientNames));
      
      // ✅ Ensure we have an array
      const itemsArray = Array.isArray(inventoryItems) ? inventoryItems : [];
      
      // ✅ Create map from the array
      const inventoryMap = new Map(itemsArray.map(item => [item.name, item]));

      const ingredientDeductions = new Map<string, {
        itemId: string;
        name: string;
        quantity: number;
        unit: Unit;
        originalQuantity: number;
        originalUnit: Unit;
        conversionNote?: string;
      }>();

      items.forEach(item => {
        item.ingredients?.forEach(ingredient => {
          const requiredQty = parseFloat(ingredient.quantity) * item.quantity;
          const key = ingredient.name;
          
          const inventoryItem = inventoryMap.get(ingredient.name);
          if (!inventoryItem) {
            console.warn(`No inventory item found for ingredient: ${ingredient.name}`);
            return;
          }
          
          try {
            const converted = convertToInventoryUnit(
              requiredQty,
              ingredient.unit as Unit,
              inventoryItem
            );
            
            // Convert ObjectId to string
            const itemId = inventoryItem._id?.toString();
            
            if (!itemId) {
              console.warn(`No ID found for inventory item: ${ingredient.name}`);
              return;
            }
            
            if (ingredientDeductions.has(key)) {
              const current = ingredientDeductions.get(key)!;
              current.quantity += converted.quantity;
              current.quantity = formatQuantity(current.quantity, current.unit);
            } else {
              ingredientDeductions.set(key, {
                itemId,
                name: ingredient.name,
                quantity: converted.quantity,
                unit: converted.unit,
                originalQuantity: requiredQty,
                originalUnit: ingredient.unit as Unit,
                conversionNote: converted.conversionNote
              });
            }
          } catch (error) {
            console.error(`Failed to convert ${ingredient.name}:`, error);
            throw new Error(`Cannot convert ${ingredient.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
      });

      const adjustments: BatchStockAdjustment[] = [];
      
      ingredientDeductions.forEach((deduction) => {
        adjustments.push({
          itemId: deduction.itemId,
          itemName: deduction.name,
          quantity: deduction.quantity,
          type: 'deduction',
          unit: deduction.unit,
          notes: deduction.conversionNote 
            ? `Deducted for order #${orderNumber}: ${deduction.conversionNote}`
            : `Deducted for order #${orderNumber} - ${orderId}`
        });
      });

      if (adjustments.length === 0) {
        throw new Error('No valid inventory items found for ingredients');
      }

      const result = await batchAdjustStock(
        adjustments,
        { type: 'order', id: orderId, number: orderNumber }
      );

      setLastTransactionId(result.transactionId);

      if (result.failed && result.failed.length > 0) {
        console.error('Failed stock adjustments:', result.failed);
        
        if (options.autoRollback !== false) {
          await rollbackOrderDeductions(result.transactionId, adjustments);
          result.rollbackPerformed = true;
        }
        
        throw new Error(`Failed to deduct ${result.failed.length} ingredients`);
      }

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
      
    } catch (error) {
      console.error('Error processing order deductions:', error);
      
      if (options.onError) {
        options.onError(error as Error);
      }
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [checkOrderStock, convertToInventoryUnit, options]);

  const rollbackOrderDeductions = useCallback(async (
    transactionId: string,
    adjustments: BatchStockAdjustment[]
  ): Promise<void> => {
    try {
      await rollbackTransaction(transactionId, adjustments);
      
      toast.warning('Inventory rollback performed', {
        description: 'Stock levels have been restored due to failed transaction',
        duration: 5000
      });
    } catch (error) {
      console.error('Failed to rollback transaction:', error);
      toast.error('Failed to rollback inventory', {
        description: 'Please manually check and restore stock levels',
        duration: 6000
      });
    }
  }, []);

  const clearStockCheck = useCallback(() => {
    setStockCheckResults([]);
    setInsufficientItems([]);
    setUnitMismatches([]);
  }, []);

  return {
    isProcessing,
    isChecking,
    lastTransactionId,
    stockCheckResults,
    insufficientItems,
    unitMismatches,
    checkOrderStock,
    processOrderDeductions,
    rollbackOrderDeductions,
    clearStockCheck
  };
}