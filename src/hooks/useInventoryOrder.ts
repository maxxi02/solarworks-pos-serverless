import { useState, useCallback } from 'react';
import { 
  batchAdjustStock, 
  checkStockAvailability, 
  rollbackTransaction,
  getInventoryItemByName,
  getInventoryByNames
} from '@/lib/inventoryService';
import { BatchAdjustmentResult, StockCheckResult, BatchStockAdjustment } from '@/types';
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

interface UseInventoryOrderOptions {
  onSuccess?: (result: BatchAdjustmentResult) => void;
  onError?: (error: Error) => void;
  onInsufficientStock?: (insufficientItems: StockCheckResult[]) => void;
  autoRollback?: boolean;
}

export function useInventoryOrder(options: UseInventoryOrderOptions = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [stockCheckResults, setStockCheckResults] = useState<StockCheckResult[]>([]);
  const [insufficientItems, setInsufficientItems] = useState<StockCheckResult[]>([]);

  // Check stock availability for an order
  const checkOrderStock = useCallback(async (
    items: OrderItem[]
  ): Promise<{
    allAvailable: boolean;
    results: StockCheckResult[];
    insufficientItems: StockCheckResult[];
  }> => {
    setIsChecking(true);
    
    try {
      // Flatten all ingredients with their required quantities
      const ingredientRequirements = new Map<string, number>();
      
      items.forEach(item => {
        item.ingredients?.forEach(ingredient => {
          const requiredQty = parseFloat(ingredient.quantity) * item.quantity;
          const key = ingredient.name;
          
          ingredientRequirements.set(
            key, 
            (ingredientRequirements.get(key) || 0) + requiredQty
          );
        });
      });

      // Convert to array format for API check
      const stockChecks = Array.from(ingredientRequirements.entries()).map(
        ([name, quantity]) => ({
          itemName: name,
          quantity: Math.ceil(quantity * 100) / 100 // Round to 2 decimal places
        })
      );

      // Check availability with inventory service
      const result = await checkStockAvailability(stockChecks);
      
      setStockCheckResults(result.results);
      setInsufficientItems(result.insufficientItems);
      
      if (!result.allAvailable && options.onInsufficientStock) {
        options.onInsufficientStock(result.insufficientItems);
      }
      
      return result;
    } catch (error) {
      console.error('Error checking stock:', error);
      throw error;
    } finally {
      setIsChecking(false);
    }
  }, [options]);

  // Process order - deduct ingredients from inventory
  const processOrderDeductions = useCallback(async (
    orderId: string,
    orderNumber: string,
    items: OrderItem[]
  ): Promise<BatchAdjustmentResult> => {
    setIsProcessing(true);
    
    try {
      // First check if all ingredients are available
      const stockCheck = await checkOrderStock(items);
      
      if (!stockCheck.allAvailable) {
        const error = new Error('Insufficient stock for some ingredients');
        (error as any).insufficientItems = stockCheck.insufficientItems;
        throw error;
      }

      // Calculate total ingredient deductions
      const ingredientDeductions = new Map<string, {
        itemId?: string;
        name: string;
        quantity: number;
        unit: string;
      }>();

      // First, get all unique ingredient names
      const allIngredientNames = new Set<string>();
      items.forEach(item => {
        item.ingredients?.forEach(ingredient => {
          allIngredientNames.add(ingredient.name);
        });
      });

      // Batch lookup inventory items by name
      const inventoryItems = await getInventoryByNames(Array.from(allIngredientNames));
      const inventoryMap = new Map(inventoryItems.map(item => [item.name, item]));

      // Calculate total quantities needed
      items.forEach(item => {
        item.ingredients?.forEach(ingredient => {
          const requiredQty = parseFloat(ingredient.quantity) * item.quantity;
          const key = ingredient.name;
          
          if (ingredientDeductions.has(key)) {
            const current = ingredientDeductions.get(key)!;
            current.quantity += requiredQty;
          } else {
            const inventoryItem = inventoryMap.get(ingredient.name);
            ingredientDeductions.set(key, {
              itemId: inventoryItem?._id,
              name: ingredient.name,
              quantity: requiredQty,
              unit: ingredient.unit
            });
          }
        });
      });

      // Prepare batch adjustments
      const adjustments: BatchStockAdjustment[] = [];
      
      ingredientDeductions.forEach((deduction) => {
        if (!deduction.itemId) {
          console.warn(`No inventory item found for ingredient: ${deduction.name}`);
          return;
        }
        
        adjustments.push({
          itemId: deduction.itemId,
          itemName: deduction.name,
          quantity: deduction.quantity,
          type: 'deduction',
          unit: deduction.unit,
          notes: `Deducted for order #${orderNumber} - ${orderId}`
        });
      });

      if (adjustments.length === 0) {
        throw new Error('No valid inventory items found for ingredients');
      }

      // Process batch deduction
      const result = await batchAdjustStock(
        adjustments,
        { type: 'order', id: orderId, number: orderNumber }
      );

      setLastTransactionId(result.transactionId);

      // Handle failed adjustments
      if (result.failed && result.failed.length > 0) {
        console.error('Failed stock adjustments:', result.failed);
        
        // Trigger rollback if auto-rollback is enabled
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
  }, [checkOrderStock, options]);

  // Rollback order deductions
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

  // Clear stock check results
  const clearStockCheck = useCallback(() => {
    setStockCheckResults([]);
    setInsufficientItems([]);
  }, []);

  return {
    isProcessing,
    isChecking,
    lastTransactionId,
    stockCheckResults,
    insufficientItems,
    checkOrderStock,
    processOrderDeductions,
    rollbackOrderDeductions,
    clearStockCheck
  };
}