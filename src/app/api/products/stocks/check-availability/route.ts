import { NextRequest, NextResponse } from 'next/server';
import MONGODB from '@/config/db';
import { 
  INVENTORY_COLLECTION, 
  Inventory 
} from '@/models/Inventory';
import { 
  Unit,
  smartConvert,
  areUnitsCompatible,
  hasDensity,
  formatQuantity,
  isValidUnit,
  getUnitCategory
} from '@/lib/unit-conversion';

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

      // Find inventory item
      const inventoryItem = await MONGODB
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

      const inventoryUnit = inventoryItem.unit as Unit;
      const requiredUnit = (item.unit as Unit) || inventoryUnit;
      let convertedQuantity = item.quantity;
      let conversionNote: string | undefined;
      let conversionError: string | undefined;

      // If units are different, try to convert
      if (requiredUnit !== inventoryUnit) {
        try {
          if (!areUnitsCompatible(requiredUnit, inventoryUnit)) {
            const fromCategory = getUnitCategory(requiredUnit);
            const toCategory = getUnitCategory(inventoryUnit);
            
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
          
          convertedQuantity = smartConvert(
            item.quantity,
            requiredUnit,
            inventoryUnit,
            inventoryItem.name
          );
          
          convertedQuantity = formatQuantity(convertedQuantity, inventoryUnit);
          conversionNote = `${item.quantity} ${requiredUnit} = ${convertedQuantity} ${inventoryUnit}`;
          
        } catch (error) {
          conversionError = error instanceof Error ? error.message : 'Unit conversion failed';
        }
      }

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
}