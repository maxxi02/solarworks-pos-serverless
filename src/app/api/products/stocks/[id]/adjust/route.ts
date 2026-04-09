import { NextRequest, NextResponse } from 'next/server';
import { CLIENT, MONGODB } from '@/config/db';
import { 
  INVENTORY_COLLECTION, 
  Inventory,
  updateInventoryItem 
} from '@/models/Inventory';
import { 
  STOCK_ADJUSTMENT_COLLECTION, 
  createStockAdjustment 
} from '@/models/StockAdjustments';
import { ObjectId } from 'mongodb';
import { 
  Unit,
  smartConvert,
  areUnitsCompatible,
  hasDensity,
  formatQuantity,
  getUnitCategory
} from '@/lib/unit-conversion';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = CLIENT.startSession();
  try {
    let response: NextResponse = NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 });
    
    await session.withTransaction(async () => {
      // Await the params first
      const { id } = await params;
      
      if (!ObjectId.isValid(id)) {
        response = NextResponse.json(
          { error: 'Invalid item ID format' },
          { status: 400 }
        );
        return;
      }

      const body = await request.json();
      const { type, quantity, notes, performedBy, reference, unit } = body;

      // Validate quantity
      if (quantity === undefined || quantity <= 0 || quantity > 100000) {
        response = NextResponse.json(
          { error: 'Quantity must be between 1 and 100,000' },
          { status: 400 }
        );
        return;
      }

      // Get inventory item
      const inventoryItem = await MONGODB
        .collection(INVENTORY_COLLECTION)
        .findOne(
          { _id: new ObjectId(id) },
          { session }
        ) as Inventory | null;
      
      if (!inventoryItem) {
        response = NextResponse.json(
          { error: 'Item not found' },
          { status: 404 }
        );
        return;
      }

      let convertedQuantity = quantity;
      let originalQuantity: number | undefined;
      let originalUnit: Unit | undefined;
      let conversionNote: string | undefined;

      const inventoryUnit = inventoryItem.unit as Unit;

      // Handle unit conversion if a different unit is provided
      if (unit && unit !== inventoryUnit) {
        try {
          // Check if units are compatible
          if (!areUnitsCompatible(unit, inventoryUnit)) {
            const fromCategory = getUnitCategory(unit);
            const toCategory = getUnitCategory(inventoryUnit);
            
            if ((fromCategory === 'weight' && toCategory === 'volume') ||
                (fromCategory === 'volume' && toCategory === 'weight')) {
              
              if (!inventoryItem.density && !hasDensity(inventoryItem.name)) {
                response = NextResponse.json(
                  { 
                    error: 'Cannot convert units',
                    details: `No density data for ${inventoryItem.name}. Please add density or use ${inventoryUnit}.`
                  },
                  { status: 400 }
                );
                return;
              }
            } else {
              response = NextResponse.json(
                { 
                  error: 'Incompatible units',
                  details: `Cannot convert ${unit} to ${inventoryUnit}`
                },
                { status: 400 }
              );
              return;
            }
          }

          convertedQuantity = smartConvert(
            quantity,
            unit,
            inventoryUnit,
            inventoryItem.name
          );
          
          convertedQuantity = formatQuantity(convertedQuantity, inventoryUnit);
          originalQuantity = quantity;
          originalUnit = unit as Unit;
          conversionNote = `${quantity} ${unit} = ${convertedQuantity} ${inventoryUnit}`;
        } catch (error) {
          response = NextResponse.json(
            { 
              error: 'Unit conversion failed',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 400 }
          );
          return;
        }
      }

      const previousStock = inventoryItem.currentStock;
      let newStock = previousStock;

      // Calculate new stock based on adjustment type
      switch (type) {
        case 'restock':
          newStock = previousStock + convertedQuantity;
          if (newStock > 100000) {
            response = NextResponse.json(
              { error: 'Stock cannot exceed 100,000 units' },
              { status: 400 }
            );
            return;
          }
          break;
        case 'usage':
        case 'waste':
        case 'deduction':
          if (previousStock < convertedQuantity) {
            response = NextResponse.json(
              { 
                error: 'Insufficient stock',
                available: previousStock,
                requested: convertedQuantity,
                originalRequested: quantity,
                originalUnit: unit
              },
              { status: 400 }
            );
            return;
          }
          newStock = Math.max(0, previousStock - convertedQuantity);
          break;
        case 'correction':
          if (convertedQuantity > 100000) {
            response = NextResponse.json(
              { error: 'Stock cannot exceed 100,000 units' },
              { status: 400 }
            );
            return;
          }
          newStock = convertedQuantity;
          break;
        default:
          response = NextResponse.json(
            { error: 'Invalid adjustment type' },
            { status: 400 }
          );
          return;
      }

      // Ensure stock doesn't go below 0 and format
      newStock = Math.max(0, formatQuantity(newStock, inventoryUnit));

      // Prepare updates
      const updates: Partial<Inventory> = {
        currentStock: newStock
      };

      // Update lastRestocked if restocking
      if (type === 'restock') {
        updates.lastRestocked = new Date();
      }

      // Calculate updates with status
      const updatedData = updateInventoryItem(inventoryItem, updates);

      // Update inventory
      await MONGODB.collection(INVENTORY_COLLECTION).updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData },
        { session }
      );

      // Create stock adjustment record
      const adjustment = createStockAdjustment({
        itemId: new ObjectId(id),
        itemName: inventoryItem.name,
        type,
        quantity: convertedQuantity,
        unit: inventoryUnit,
        originalQuantity,
        originalUnit,
        previousStock,
        newStock,
        notes: conversionNote 
          ? `${notes || ''} (${conversionNote})`.trim()
          : notes,
        conversionNote,
        reference: reference || {
          type: 'manual',
          id: `adj-${Date.now()}`
        },
        transactionId: `adj-${Date.now()}`,
        performedBy: performedBy || 'Admin'
      });

      await MONGODB
        .collection(STOCK_ADJUSTMENT_COLLECTION)
        .insertOne(adjustment, { session });

      // Get updated status
      const status = newStock <= 0 ? 'critical' :
                    newStock <= inventoryItem.reorderPoint ? 'low' :
                    newStock <= inventoryItem.minStock ? 'warning' : 'ok';

      response = NextResponse.json({
        success: true,
        newStock,
        status,
        adjustment,
        conversionNote
      });
    });

    return response;

  } catch (error) {
    console.error('Error adjusting stock:', error);
    return NextResponse.json(
      { 
        error: 'Failed to adjust stock',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.endSession();
  }
}