import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/config/db-Connect';
import { 
  INVENTORY_COLLECTION, 
  Inventory 
} from '@/models/Inventory';

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

      const results = [];
      const insufficientItems = [];
      let allAvailable = true;

      for (const item of items) {
        // Validate required fields
        if (!item.itemName || item.quantity === undefined) {
          results.push({
            itemId: null,
            name: item.itemName || 'Unknown',
            available: false,
            currentStock: 0,
            requiredQuantity: item.quantity || 0,
            insufficient: true,
            shortBy: item.quantity || 0,
            unit: 'unit',
            error: 'Missing item name or quantity'
          });
          
          insufficientItems.push({
            itemId: null,
            name: item.itemName || 'Unknown',
            available: false,
            currentStock: 0,
            requiredQuantity: item.quantity || 0,
            shortBy: item.quantity || 0,
            unit: 'unit'
          });
          
          allAvailable = false;
          continue;
        }

        // Find inventory item by name (case-insensitive)
        const inventoryItem = await db
          .collection(INVENTORY_COLLECTION)
          .findOne({ 
            name: { $regex: new RegExp(`^${item.itemName}$`, 'i') }
          }) as Inventory | null;

        if (!inventoryItem) {
          results.push({
            itemId: null,
            name: item.itemName,
            available: false,
            currentStock: 0,
            requiredQuantity: item.quantity,
            insufficient: true,
            shortBy: item.quantity,
            unit: 'unit',
            error: 'Item not found in inventory'
          });
          
          insufficientItems.push({
            itemId: null,
            name: item.itemName,
            available: false,
            currentStock: 0,
            requiredQuantity: item.quantity,
            shortBy: item.quantity,
            unit: 'unit'
          });
          
          allAvailable = false;
          continue;
        }

        const available = inventoryItem.currentStock >= item.quantity;
        const shortBy = !available ? item.quantity - inventoryItem.currentStock : 0;

        const result = {
          itemId: inventoryItem._id?.toString() || null,
          name: inventoryItem.name,
          available,
          currentStock: inventoryItem.currentStock,
          requiredQuantity: item.quantity,
          insufficient: !available,
          shortBy,
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
        insufficientItems
      });
      
    } catch (error) {
      console.error('Error checking stock availability:', error);
      return NextResponse.json(
        { error: 'Failed to check stock availability' },
        { status: 500 }
      );
    }
  });
}