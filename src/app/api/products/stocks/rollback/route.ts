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
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  return withTransaction(async (session) => {
    try {
      const body = await req.json();
      const { transactionId, adjustments } = body;
      
      if (!transactionId || !adjustments || !Array.isArray(adjustments)) {
        return NextResponse.json(
          { error: 'Invalid request: transactionId and adjustments array are required' },
          { status: 400 }
        );
      }

      const db = session.client.db();
      const rolledBackItems = [];
      const failedRollbacks = [];

      // Process rollback adjustments
      for (const adj of adjustments) {
        try {
          // Validate itemId
          if (!ObjectId.isValid(adj.itemId)) {
            failedRollbacks.push({
              itemId: adj.itemId,
              error: 'Invalid item ID format'
            });
            continue;
          }

          // Get inventory item
          const inventoryItem = await db
            .collection(INVENTORY_COLLECTION)
            .findOne(
              { _id: new ObjectId(adj.itemId) },
              { session }
            ) as Inventory | null;
          
          if (!inventoryItem) {
            failedRollbacks.push({
              itemId: adj.itemId,
              error: 'Item not found'
            });
            continue;
          }

          const previousStock = inventoryItem.currentStock;
          let newStock = previousStock;

          // Reverse the operation
          if (adj.type === 'restock') {
            newStock = Math.max(0, inventoryItem.currentStock - adj.quantity);
          } else if (adj.type === 'deduction') {
            newStock = inventoryItem.currentStock + adj.quantity;
          } else {
            failedRollbacks.push({
              itemId: adj.itemId,
              name: inventoryItem.name,
              error: `Invalid adjustment type for rollback: ${adj.type}`
            });
            continue;
          }

          // Prepare updates
          const updates: Partial<Inventory> = {
            currentStock: newStock
          };

          // Calculate updates with status using helper function
          const updatedData = updateInventoryItem(inventoryItem, updates);

          // Update inventory
          await db.collection(INVENTORY_COLLECTION).updateOne(
            { _id: new ObjectId(adj.itemId) },
            { $set: updatedData },
            { session }
          );

          // Record rollback adjustment
          const rollbackAdjustment = createStockAdjustment({
            itemId: new ObjectId(adj.itemId),
            itemName: inventoryItem.name,
            type: 'correction',
            quantity: adj.quantity,
            previousStock,
            newStock,
            unit: inventoryItem.unit,
            notes: adj.notes || `Rollback of transaction ${transactionId}`,
            reference: {
              type: 'rollback',
              id: transactionId,
              number: adj.reference?.number
            },
            transactionId: `rollback-${transactionId}`,
            performedBy: 'system'
          });

          await db
            .collection(STOCK_ADJUSTMENT_COLLECTION)
            .insertOne(rollbackAdjustment, { session });

          rolledBackItems.push({
            itemId: adj.itemId,
            name: inventoryItem.name,
            previousStock,
            newStock,
            status: updatedData.status
          });

        } catch (error) {
          console.error(`Error rolling back ${adj.itemId}:`, error);
          failedRollbacks.push({
            itemId: adj.itemId,
            name: adj.itemName || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // If any rollbacks failed, throw error to trigger rollback of the rollback operation
      if (failedRollbacks.length > 0 && rolledBackItems.length === 0) {
        throw new Error(JSON.stringify({
          message: 'All rollback operations failed',
          failedRollbacks,
          transactionId
        }));
      }

      return NextResponse.json({
        success: failedRollbacks.length === 0,
        message: `Rollback completed. ${rolledBackItems.length} items restored, ${failedRollbacks.length} failed.`,
        rolledBackItems,
        failedRollbacks,
        transactionId,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error in rollback:', error);
      
      // Check if this is our custom error
      if (error instanceof Error && error.message.includes('All rollback operations failed')) {
        try {
          const errorData = JSON.parse(error.message);
          return NextResponse.json({
            success: false,
            message: errorData.message,
            rolledBackItems: [],
            failedRollbacks: errorData.failedRollbacks,
            transactionId: errorData.transactionId,
            timestamp: new Date()
          }, { status: 500 });
        } catch (parseError) {
          // If JSON parse fails, return generic error
          return NextResponse.json(
            { error: 'Rollback operation failed' },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to rollback transaction',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  });
}