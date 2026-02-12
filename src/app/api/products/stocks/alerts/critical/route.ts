import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/config/db-Connect';
import { 
  INVENTORY_COLLECTION, 
  Inventory 
} from '@/models/Inventory';

export async function GET(req: NextRequest) {
  return withDatabase(async (db) => {
    try {
      const criticalItems = await db
        .collection<Inventory>(INVENTORY_COLLECTION)
        .find({
          $or: [
            { status: 'critical' },
            { currentStock: { $lte: 0 } }
          ]
        })
        .sort({ currentStock: 1 })
        .toArray();

      const alerts = criticalItems.map(item => ({
        itemId: item._id?.toString() || '',
        itemName: item.name,
        currentStock: item.currentStock,
        minStock: item.minStock,
        reorderPoint: item.reorderPoint,
        unit: item.unit,
        status: 'critical',
        location: item.location,
        supplier: item.supplier,
        lastRestocked: item.lastRestocked,
        outOfStock: item.currentStock <= 0,
        percentage: Math.min(100, (item.currentStock / item.maxStock) * 100)
      }));

      return NextResponse.json(alerts);

    } catch (error) {
      console.error('Error fetching critical stock alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch critical stock alerts' },
        { status: 500 }
      );
    }
  });
}