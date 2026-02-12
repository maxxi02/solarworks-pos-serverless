import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/config/db-Connect';
import { 
  INVENTORY_COLLECTION, 
  Inventory,
  updateInventoryItem 
} from '@/models/Inventory';
import { 
  STOCK_ADJUSTMENT_COLLECTION, 
  createStockAdjustment 
} from '@/models/StockAdjustments';
import { ObjectId, Document, WithId } from 'mongodb';

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
          // Validate itemId
          if (!ObjectId.isValid(adj.itemId)) {
            failed.push({
              itemId: adj.itemId,
              name: adj.itemName || 'Unknown',
              error: 'Invalid item ID format',
              requestedQuantity: adj.quantity
            });
            continue;
          }

          // Get inventory item - remove type parameter to fix error
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
              requestedQuantity: adj.quantity
            });
            continue;
          }

          const previousStock = inventoryItem.currentStock;
          let newStock = previousStock;

          // Apply adjustment based on type
          if (adj.type === 'deduction') {
            if (inventoryItem.currentStock < adj.quantity) {
              failed.push({
                itemId: adj.itemId,
                name: inventoryItem.name,
                error: 'Insufficient stock',
                requestedQuantity: adj.quantity,
                availableStock: inventoryItem.currentStock
              });
              continue;
            }
            newStock = inventoryItem.currentStock - adj.quantity;
          } else if (adj.type === 'restock') {
            newStock = inventoryItem.currentStock + adj.quantity;
          } else {
            failed.push({
              itemId: adj.itemId,
              name: inventoryItem.name,
              error: `Invalid adjustment type: ${adj.type}`,
              requestedQuantity: adj.quantity
            });
            continue;
          }

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

          // Create and save stock adjustment record
          const adjustment = createStockAdjustment({
            itemId: new ObjectId(adj.itemId),
            itemName: inventoryItem.name,
            type: adj.type,
            quantity: adj.quantity,
            previousStock,
            newStock,
            unit: adj.unit || inventoryItem.unit,
            notes: adj.notes,
            reference,
            transactionId,
            performedBy: reference?.type === 'order' ? 'system' : 'admin'
          });

          await db
            .collection(STOCK_ADJUSTMENT_COLLECTION)
            .insertOne(adjustment, { session });

          // Get updated status
          const status = newStock <= 0 ? 'critical' :
                        newStock <= inventoryItem.reorderPoint ? 'low' :
                        newStock <= inventoryItem.minStock ? 'warning' : 'ok';

          successful.push({
            itemId: adj.itemId,
            name: inventoryItem.name,
            newStock,
            status,
            previousStock,
            unit: inventoryItem.unit
          });

        } catch (error) {
          console.error(`Error processing adjustment for ${adj.itemId}:`, error);
          failed.push({
            itemId: adj.itemId,
            name: adj.itemName || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
            requestedQuantity: adj.quantity
          });
        }
      }

      // If any adjustments failed, throw error to trigger rollback
      if (failed.length > 0) {
        throw new Error(JSON.stringify({
          message: 'Some adjustments failed',
          failed,
          successful,
          transactionId // Include transactionId in the error
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
            transactionId: errorData.transactionId, // Use from error data
            successful: errorData.successful || [],
            failed: errorData.failed,
            timestamp: new Date(),
            rollbackPerformed: true
          }, { status: 409 }); // 409 Conflict
        } catch (parseError) {
          // If JSON parse fails, return generic error
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