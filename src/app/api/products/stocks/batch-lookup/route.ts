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
      const { names } = body;
      
      if (!names || !Array.isArray(names)) {
        return NextResponse.json(
          { error: 'Invalid request: names array is required' },
          { status: 400 }
        );
      }

      if (names.length === 0) {
        return NextResponse.json([]);
      }

      // Find all inventory items with matching names (case-insensitive)
      const inventoryItems = await db
        .collection(INVENTORY_COLLECTION)
        .find({
          name: { 
            $in: names.map(name => new RegExp(`^${name}$`, 'i'))
          }
        })
        .toArray();

      return NextResponse.json(inventoryItems);

    } catch (error) {
      console.error('Error in batch lookup:', error);
      return NextResponse.json(
        { error: 'Failed to fetch inventory items' },
        { status: 500 }
      );
    }
  });
}