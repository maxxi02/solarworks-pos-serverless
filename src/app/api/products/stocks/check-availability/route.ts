import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/config/db-Connect';
import { 
  INVENTORY_COLLECTION, 
  Inventory,
  validateIngredientCompatibility 
} from '@/models/Inventory';
import { 
  Unit,
  smartConvert,
  areUnitsCompatible,
  hasDensity,
  formatQuantity,
  isValidUnit,
  getUnitCategory,
  getUnitMismatchError
} from '@/lib/unit-conversion';

interface StockCheckItem {
  itemName: string;
  quantity: number;
  unit?: string;
}

interface StockCheckResult {
  itemId: string | null;
  name: string;
  available: boolean;
  currentStock: number;
  currentUnit: string;
  requiredQuantity: number;
  requiredUnit: string;
  convertedQuantity?: number;
  convertedUnit?: string;
  conversionNote?: string;
  insufficient: boolean;
  shortBy?: number;
  shortByUnit?: string;
  unit: string;
  status?: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  return withDatabase(async (db) => {
    try {
      const body = await req.json();
      const { items } = body;
      
      if (!items || !Array.isArray(items)) {
        return NextResponse.json(
          { error: 'Invalid request: items array is required' },
          { status: 400 }
        );
      }

      if (items.length === 0) {
        return NextResponse.json({
          allAvailable: true,
          results: [],
          insufficientItems: []
        });
      }

      const results: StockCheckResult[] = [];
      const insufficientItems: StockCheckResult[] = [];
      let allAvailable = true;

      for (const item of items) {
        // ======================================================================
        // VALIDATION
        // ======================================================================
        
        // Validate required fields
        if (!item.itemName || item.quantity === undefined) {
          const errorResult = {
            itemId: null,
            name: item.itemName || 'Unknown',
            available: false,
            currentStock: 0,
            currentUnit: 'N/A',
            requiredQuantity: item.quantity || 0,
            requiredUnit: item.unit || 'unit',
            insufficient: true,
            shortBy: item.quantity || 0,
            shortByUnit: item.unit || 'unit',
            unit: 'unit',
            error: 'Missing item name or quantity'
          };
          
          results.push(errorResult);
          insufficientItems.push(errorResult);
          allAvailable = false;
          continue;
        }

        // Validate unit if provided
        if (item.unit && !isValidUnit(item.unit)) {
          const errorResult = {
            itemId: null,
            name: item.itemName,
            available: false,
            currentStock: 0,
            currentUnit: 'N/A',
            requiredQuantity: item.quantity,
            requiredUnit: item.unit,
            insufficient: true,
            shortBy: item.quantity,
            shortByUnit: item.unit,
            unit: 'unit',
            error: `Invalid unit: ${item.unit}`
          };
          
          results.push(errorResult);
          insufficientItems.push(errorResult);
          allAvailable = false;
          continue;
        }

        // ======================================================================
        // FIND INVENTORY ITEM
        // ======================================================================
        
        const inventoryItem = await db
          .collection(INVENTORY_COLLECTION)
          .findOne({ 
            name: { $regex: new RegExp(`^${item.itemName}$`, 'i') }
          }) as Inventory | null;

        if (!inventoryItem) {
          const errorResult = {
            itemId: null,
            name: item.itemName,
            available: false,
            currentStock: 0,
            currentUnit: 'N/A',
            requiredQuantity: item.quantity,
            requiredUnit: item.unit || 'unit',
            insufficient: true,
            shortBy: item.quantity,
            shortByUnit: item.unit || 'unit',
            unit: 'unit',
            error: 'Item not found in inventory'
          };
          
          results.push(errorResult);
          insufficientItems.push(errorResult);
          allAvailable = false;
          continue;
        }

        // ======================================================================
        // UNIT CONVERSION
        // ======================================================================
        
        const inventoryUnit = inventoryItem.unit as Unit;
        const requiredUnit = (item.unit as Unit) || inventoryUnit;
        let convertedQuantity = item.quantity;
        let conversionNote: string | undefined;
        let conversionError: string | undefined;

        // If units are different, try to convert
        if (requiredUnit !== inventoryUnit) {
          try {
            // Check if units are compatible
            if (!areUnitsCompatible(requiredUnit, inventoryUnit)) {
              const fromCategory = getUnitCategory(requiredUnit);
              const toCategory = getUnitCategory(inventoryUnit);
              
              // If different categories, check if we have density data
              if ((fromCategory === 'weight' && toCategory === 'volume') ||
                  (fromCategory === 'volume' && toCategory === 'weight')) {
                
                if (!hasDensity(inventoryItem.name) && !inventoryItem.density) {
                  throw new Error(
                    `Cannot convert ${requiredUnit} to ${inventoryUnit}. ` +
                    `No density data for ${inventoryItem.name}.`
                  );
                }
              } else {
                throw new Error(
                  `Cannot convert ${requiredUnit} (${fromCategory}) to ${inventoryUnit} (${toCategory})`
                );
              }
            }
            
            // Perform smart conversion
            convertedQuantity = smartConvert(
              item.quantity,
              requiredUnit,
              inventoryUnit,
              inventoryItem.name
            );
            
            // Format to appropriate decimal places
            convertedQuantity = formatQuantity(convertedQuantity, inventoryUnit);
            
            // Create conversion note
            conversionNote = `${item.quantity} ${requiredUnit} = ${convertedQuantity} ${inventoryUnit}`;
            
          } catch (error) {
            conversionError = error instanceof Error ? error.message : 'Unit conversion failed';
          }
        }

        // ======================================================================
        // CHECK AVAILABILITY
        // ======================================================================
        
        // If conversion failed, mark as unavailable
        if (conversionError) {
          const errorResult = {
            itemId: inventoryItem._id?.toString() || null,
            name: inventoryItem.name,
            available: false,
            currentStock: inventoryItem.currentStock,
            currentUnit: inventoryItem.unit,
            requiredQuantity: item.quantity,
            requiredUnit: requiredUnit,
            convertedQuantity,
            convertedUnit: inventoryUnit,
            conversionNote,
            insufficient: true,
            shortBy: item.quantity,
            shortByUnit: requiredUnit,
            unit: inventoryItem.unit,
            status: inventoryItem.status,
            error: conversionError
          };
          
          results.push(errorResult);
          insufficientItems.push(errorResult);
          allAvailable = false;
          continue;
        }

        // Check if stock is sufficient
        const available = inventoryItem.currentStock >= convertedQuantity;
        const shortBy = !available 
          ? formatQuantity(convertedQuantity - inventoryItem.currentStock, inventoryUnit)
          : 0;
        const shortByUnit = !available ? inventoryUnit : undefined;

        const result: StockCheckResult = {
          itemId: inventoryItem._id?.toString() || null,
          name: inventoryItem.name,
          available,
          currentStock: inventoryItem.currentStock,
          currentUnit: inventoryItem.unit,
          requiredQuantity: item.quantity,
          requiredUnit: requiredUnit,
          convertedQuantity,
          convertedUnit: inventoryUnit,
          conversionNote,
          insufficient: !available,
          shortBy,
          shortByUnit,
          unit: inventoryItem.unit,
          status: inventoryItem.status
        };

        results.push(result);

        if (!available) {
          insufficientItems.push(result);
          allAvailable = false;
        }
      }

      // ======================================================================
      // RETURN RESPONSE
      // ======================================================================
      
      return NextResponse.json({
        allAvailable,
        results,
        insufficientItems,
        summary: {
          totalItems: items.length,
          availableItems: results.filter(r => r.available).length,
          unavailableItems: results.filter(r => !r.available).length,
          itemsWithConversion: results.filter(r => r.conversionNote).length
        }
      });
      
    } catch (error) {
      console.error('Error checking stock availability:', error);
      return NextResponse.json(
        { 
          error: 'Failed to check stock availability',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  });
}