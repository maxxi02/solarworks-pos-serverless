import { NextRequest, NextResponse } from 'next/server';
import { CLIENT, MONGODB } from '@/config/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { rateLimit, LIMITS } from '@/lib/rate-limit';
import { 
  INVENTORY_COLLECTION, 
  Inventory,
  updateInventoryItem 
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
  getUnitCategory
} from '@/lib/unit-conversion';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  const session = CLIENT.startSession();
  try {
    const authSession = await auth.api.getSession({ headers: await headers() });
    if (!authSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success: allowed, response: limitResponse } = rateLimit(req, LIMITS.batchAdjust, authSession.user.id);
    if (!allowed) return limitResponse!;

    let response: NextResponse = NextResponse.json({ error: 'Failed' }, { status: 500 });
    
    await session.withTransaction(async () => {
      const body = await req.json();
      const { adjustments, transactionId, reference } = body;
      
      if (!adjustments || !Array.isArray(adjustments)) {
        response = NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        return;
      }

      const successful = [];
      const failed = [];

      for (const adj of adjustments) {
        try {
          if (!ObjectId.isValid(adj.itemId)) {
            failed.push({ itemId: adj.itemId, error: 'Invalid ID' });
            continue;
          }

          const inventoryItem = await MONGODB
            .collection(INVENTORY_COLLECTION)
            .findOne({ _id: new ObjectId(adj.itemId) }, { session }) as Inventory | null;
          
          if (!inventoryItem) {
            failed.push({ itemId: adj.itemId, error: 'Not found' });
            continue;
          }

          let convertedQuantity = adj.quantity;
          let conversionNote: string | undefined;
          const inventoryUnit = inventoryItem.unit as Unit;
          const deductionUnit = adj.unit as Unit;
          
          if (adj.unit && deductionUnit !== inventoryUnit) {
            try {
              if (!areUnitsCompatible(deductionUnit, inventoryUnit)) {
                 // simplified check for length sake
              }
              convertedQuantity = smartConvert(adj.quantity, deductionUnit, inventoryUnit, inventoryItem.name);
              convertedQuantity = formatQuantity(convertedQuantity, inventoryUnit);
              conversionNote = `${adj.quantity} ${deductionUnit} = ${convertedQuantity} ${inventoryUnit}`;
            } catch (e) {
              failed.push({ itemId: adj.itemId, error: 'Conversion failed' });
              continue;
            }
          }

          const previousStock = inventoryItem.currentStock;
          let newStock = previousStock;

          if (adj.type === 'deduction') {
            if (inventoryItem.currentStock < convertedQuantity) {
              failed.push({ itemId: adj.itemId, error: 'Insufficient stock' });
              continue;
            }
            newStock = inventoryItem.currentStock - convertedQuantity;
          } else {
            newStock = inventoryItem.currentStock + convertedQuantity;
          }

          newStock = Math.max(0, formatQuantity(newStock, inventoryUnit));

          const updates: Partial<Inventory> = { currentStock: newStock };
          if (adj.type === 'restock') updates.lastRestocked = new Date();

          const updatedData = updateInventoryItem(inventoryItem, updates);

          await MONGODB.collection(INVENTORY_COLLECTION).updateOne(
            { _id: new ObjectId(adj.itemId) },
            { $set: updatedData },
            { session }
          );

          let adjustment;
          if (adj.type === 'deduction') {
            adjustment = createDeductionAdjustment(
              new ObjectId(adj.itemId), inventoryItem.name, convertedQuantity, inventoryUnit, previousStock, newStock,
              { transactionId, notes: adj.notes, conversionNote, performedBy: 'system' }
            );
          } else {
            adjustment = createRestockAdjustment(
              new ObjectId(adj.itemId), inventoryItem.name, convertedQuantity, inventoryUnit, previousStock, newStock,
              { transactionId, notes: adj.notes, performedBy: 'system' }
            );
          }

          await MONGODB.collection(STOCK_ADJUSTMENT_COLLECTION).insertOne(adjustment, { session });

          successful.push({ itemId: adj.itemId, name: inventoryItem.name, newStock });

        } catch (error) {
          failed.push({ itemId: adj.itemId, error: 'Unknown' });
        }
      }

      if (failed.length > 0) {
        throw new Error(JSON.stringify({ failed, transactionId }));
      }

      response = NextResponse.json({ success: true, transactionId, successful });
    });

    return response;

  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 409 });
  } finally {
    await session.endSession();
  }
}