import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/config/db-Connect';
import { 
  INVENTORY_COLLECTION, 
  Inventory,
  updateInventoryItem,
  validateIngredientCompatibility
} from '@/models/Inventory';
import { 
  STOCK_ADJUSTMENT_COLLECTION, 
  createDeductionAdjustment,
  createRestockAdjustment
} from '@/models/StockAdjustments';
import { 
  Unit,
  smartConvert,
  areUnitsCompatible,
  hasDensity,
  formatQuantity,
  isValidUnit,
  toValidUnit,
  getUnitCategory
} from '@/lib/unit-conversion';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  return withTransaction(async (session) => {
    try {
      const body = await req.json();
      const { adjustments, transactionId, reference, timestamp } = body;
      
      if (!adjustments || !Array.isArray(adjustments)) {
        return NextResponse.json(
          { error: 'Invalid request: adjustments array is required' },
          { status: 400 }
        );
      }

      const db = session.client.db();
      const successful = [];
      const failed = [];

      // Process each adjustment
      for (const adj of adjustments) {
        try {
          // ======================================================================
          // VALIDATION
          // ======================================================================
          
          // Validate itemId
          if (!ObjectId.isValid(adj.itemId)) {
            failed.push({
              itemId: adj.itemId,
              name: adj.itemName || 'Unknown',
              error: 'Invalid item ID format',
              requestedQuantity: adj.quantity,
              requestedUnit: adj.unit
            });
            continue;
          }

          // Validate adjustment type
          if (!['deduction', 'restock'].includes(adj.type)) {
            failed.push({
              itemId: adj.itemId,
              name: adj.itemName || 'Unknown',
              error: `Invalid adjustment type: ${adj.type}. Must be 'deduction' or 'restock'`,
              requestedQuantity: adj.quantity,
              requestedUnit: adj.unit
            });
            continue;
          }

          // Validate unit if provided
          if (adj.unit && !isValidUnit(adj.unit)) {
            failed.push({
              itemId: adj.itemId,
              name: adj.itemName || 'Unknown',
              error: `Invalid unit: ${adj.unit}`,
              requestedQuantity: adj.quantity,
              requestedUnit: adj.unit
            });
            continue;
          }

          // ======================================================================
          // GET INVENTORY ITEM
          // ======================================================================
          
          const inventoryItem = await db
            .collection(INVENTORY_COLLECTION)
            .findOne(
              { _id: new ObjectId(adj.itemId) },
              { session }
            ) as Inventory | null;
          
          if (!inventoryItem) {
            failed.push({
              itemId: adj.itemId,
              name: adj.itemName || 'Unknown',
              error: 'Item not found',
              requestedQuantity: adj.quantity,
              requestedUnit: adj.unit
            });
            continue;
          }

          // ======================================================================
          // UNIT CONVERSION
          // ======================================================================
          
          let convertedQuantity: number;
          let conversionNote: string | undefined;
          const inventoryUnit = inventoryItem.unit as Unit;
          const deductionUnit = adj.unit as Unit;
          
          // If no unit provided, assume it's already in inventory unit
          if (!adj.unit) {
            convertedQuantity = adj.quantity;
          } 
          // If units are the same, no conversion needed
          else if (deductionUnit === inventoryUnit) {
            convertedQuantity = adj.quantity;
          }
          // Try to convert
          else {
            try {
              // Check if units are compatible
              if (!areUnitsCompatible(deductionUnit, inventoryUnit)) {
                const fromCategory = getUnitCategory(deductionUnit);
                const toCategory = getUnitCategory(inventoryUnit);
                
                // If different categories, check if we have density data
                if ((fromCategory === 'weight' && toCategory === 'volume') ||
                    (fromCategory === 'volume' && toCategory === 'weight')) {
                  
                  if (!hasDensity(inventoryItem.name) && !inventoryItem.density) {
                    failed.push({
                      itemId: adj.itemId,
                      name: inventoryItem.name,
                      error: `Cannot convert ${deductionUnit} to ${inventoryUnit}. No density data for ${inventoryItem.name}.`,
                      requestedQuantity: adj.quantity,
                      requestedUnit: adj.unit,
                      inventoryUnit: inventoryItem.unit
                    });
                    continue;
                  }
                } else {
                  failed.push({
                    itemId: adj.itemId,
                    name: inventoryItem.name,
                    error: `Cannot convert ${deductionUnit} (${fromCategory}) to ${inventoryUnit} (${toCategory})`,
                    requestedQuantity: adj.quantity,
                    requestedUnit: adj.unit,
                    inventoryUnit: inventoryItem.unit
                  });
                  continue;
                }
              }
              
              // Perform smart conversion
              convertedQuantity = smartConvert(
                adj.quantity,
                deductionUnit,
                inventoryUnit,
                inventoryItem.name
              );
              
              // Format to appropriate decimal places
              convertedQuantity = formatQuantity(convertedQuantity, inventoryUnit);
              
              // Create conversion note for audit
              conversionNote = `${adj.quantity} ${deductionUnit} = ${convertedQuantity} ${inventoryUnit}`;
              
            } catch (error) {
              failed.push({
                itemId: adj.itemId,
                name: inventoryItem.name,
                error: error instanceof Error ? error.message : 'Unit conversion failed',
                requestedQuantity: adj.quantity,
                requestedUnit: adj.unit,
                inventoryUnit: inventoryItem.unit
              });
              continue;
            }
          }

          // ======================================================================
          // APPLY ADJUSTMENT
          // ======================================================================
          
          const previousStock = inventoryItem.currentStock;
          let newStock = previousStock;

          if (adj.type === 'deduction') {
            // Check if sufficient stock
            if (inventoryItem.currentStock < convertedQuantity) {
              failed.push({
                itemId: adj.itemId,
                name: inventoryItem.name,
                error: 'Insufficient stock',
                requestedQuantity: adj.quantity,
                requestedUnit: adj.unit,
                convertedQuantity,
                convertedUnit: inventoryUnit,
                availableStock: inventoryItem.currentStock,
                shortBy: formatQuantity(convertedQuantity - inventoryItem.currentStock, inventoryUnit)
              });
              continue;
            }
            newStock = inventoryItem.currentStock - convertedQuantity;
          } else if (adj.type === 'restock') {
            newStock = inventoryItem.currentStock + convertedQuantity;
          }

          // Ensure stock doesn't go below 0 and format
          newStock = Math.max(0, formatQuantity(newStock, inventoryUnit));

          // ======================================================================
          // UPDATE INVENTORY
          // ======================================================================
          
          // Prepare updates
          const updates: Partial<Inventory> = {
            currentStock: newStock
          };

          // Update lastRestocked if restocking
          if (adj.type === 'restock') {
            updates.lastRestocked = new Date();
          }

          // Calculate updates with status using helper function
          const updatedData = updateInventoryItem(inventoryItem, updates);

          // Update inventory
          await db.collection(INVENTORY_COLLECTION).updateOne(
            { _id: new ObjectId(adj.itemId) },
            { $set: updatedData },
            { session }
          );

          // ======================================================================
          // CREATE ADJUSTMENT RECORD
          // ======================================================================
          
          let adjustment;
          
          if (adj.type === 'deduction') {
            adjustment = createDeductionAdjustment(
              new ObjectId(adj.itemId),
              inventoryItem.name,
              convertedQuantity,
              inventoryUnit,
              previousStock,
              newStock,
              {
                originalQuantity: adj.quantity,
                originalUnit: deductionUnit,
                orderId: reference?.id,
                orderNumber: reference?.number,
                transactionId,
                notes: adj.notes,
                conversionNote,
                performedBy: reference?.type === 'order' ? 'system' : 'admin'
              }
            );
          } else {
            adjustment = createRestockAdjustment(
              new ObjectId(adj.itemId),
              inventoryItem.name,
              convertedQuantity,
              inventoryUnit,
              previousStock,
              newStock,
              {
                notes: adj.notes,
                transactionId,
                performedBy: reference?.type === 'order' ? 'system' : 'admin'
              }
            );
          }

          await db
            .collection(STOCK_ADJUSTMENT_COLLECTION)
            .insertOne(adjustment, { session });

          // ======================================================================
          // PREPARE RESPONSE
          // ======================================================================
          
          // Get updated status
          const status = newStock <= 0 ? 'critical' :
                        newStock <= inventoryItem.reorderPoint ? 'low' :
                        newStock <= inventoryItem.minStock ? 'warning' : 'ok';

          successful.push({
            itemId: adj.itemId,
            name: inventoryItem.name,
            originalQuantity: adj.quantity,
            originalUnit: adj.unit || inventoryUnit,
            convertedQuantity,
            convertedUnit: inventoryUnit,
            conversionNote,
            previousStock,
            newStock,
            status,
            unit: inventoryItem.unit
          });

        } catch (error) {
          console.error(`Error processing adjustment for ${adj.itemId}:`, error);
          failed.push({
            itemId: adj.itemId,
            name: adj.itemName || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
            requestedQuantity: adj.quantity,
            requestedUnit: adj.unit
          });
        }
      }

      // ======================================================================
      // HANDLE FAILURES
      // ======================================================================
      
      // If any adjustments failed, throw error to trigger rollback
      if (failed.length > 0) {
        throw new Error(JSON.stringify({
          message: 'Some adjustments failed',
          failed,
          successful,
          transactionId
        }));
      }

      return NextResponse.json({
        success: true,
        transactionId,
        successful,
        failed,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error in batch stock adjustment:', error);
      
      // Check if this is our custom error with failed adjustments
      if (error instanceof Error && error.message.includes('Some adjustments failed')) {
        try {
          const errorData = JSON.parse(error.message);
          return NextResponse.json({
            success: false,
            transactionId: errorData.transactionId,
            successful: errorData.successful || [],
            failed: errorData.failed,
            timestamp: new Date(),
            rollbackPerformed: true
          }, { status: 409 });
        } catch (parseError) {
          return NextResponse.json(
            { error: 'Batch adjustment failed' },
            { status: 409 }
          );
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to process batch stock adjustment',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  });
}