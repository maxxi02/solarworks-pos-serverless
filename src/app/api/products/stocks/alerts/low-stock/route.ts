import { NextRequest, NextResponse } from 'next/server';
import MONGODB from '@/config/db';
import { 
  INVENTORY_COLLECTION, 
  Inventory 
} from '@/models/Inventory';

export async function GET(req: NextRequest) {
  try {
    const lowStockItems = await MONGODB
      .collection<Inventory>(INVENTORY_COLLECTION)
      .find({
        status: { $in: ['low', 'warning'] },
        currentStock: { $gt: 0 }
      })
      .sort({ currentStock: 1 })
      .toArray();

    const alerts = lowStockItems.map(item => {
      // Calculate estimated daily usage based on min stock (assuming 30 days supply)
      const estimatedDailyUsage = item.minStock > 0 ? item.minStock / 30 : 1;
      const daysUntilReorder = Math.max(0, 
        Math.ceil((item.reorderPoint - item.currentStock) / estimatedDailyUsage)
      );

      return {
        itemId: item._id?.toString() || '',
        itemName: item.name,
        currentStock: item.currentStock,
        minStock: item.minStock,
        maxStock: item.maxStock,
        reorderPoint: item.reorderPoint,
        unit: item.unit,
        status: item.status,
        location: item.location,
        supplier: item.supplier,
        lastRestocked: item.lastRestocked,
        daysUntilReorder,
        percentage: Math.min(100, (item.currentStock / item.maxStock) * 100),
        needsImmediateRestock: item.currentStock <= item.reorderPoint
      };
    });

    return NextResponse.json(alerts);

  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch low stock alerts' },
      { status: 500 }
    );
  }
}