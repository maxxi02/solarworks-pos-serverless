import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/config/db-Connect';
import { 
  STOCK_ADJUSTMENT_COLLECTION 
} from '@/models/StockAdjustments';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withDatabase(async (db) => {
    try {
      const { id } = await params;
      
      // Validate if it's a valid ObjectId
      const query = ObjectId.isValid(id) 
        ? { itemId: new ObjectId(id) }
        : { itemId: id }; // Fallback for string IDs
      
      const adjustments = await db
        .collection(STOCK_ADJUSTMENT_COLLECTION)
        .find(query)
        .sort({ createdAt: -1 })
        .limit(100) // Limit to last 100 adjustments
        .toArray();

      // Format for display
      const formattedAdjustments = adjustments.map(adj => ({
        ...adj,
        _id: adj._id.toString(),
        itemId: adj.itemId.toString(),
        createdAt: adj.createdAt.toISOString(),
        // Add display fields
        displayQuantity: `${adj.quantity} ${adj.unit}`,
        displayChange: `${adj.newStock - adj.previousStock > 0 ? '+' : ''}${adj.newStock - adj.previousStock} ${adj.unit}`,
        displayPreviousStock: `${adj.previousStock} ${adj.unit}`,
        displayNewStock: `${adj.newStock} ${adj.unit}`
      }));

      return NextResponse.json(formattedAdjustments);
      
    } catch (error) {
      console.error('Error fetching adjustments:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch adjustments',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  });
}

// Optional: POST to create a manual adjustment (if needed)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withDatabase(async (db) => {
    try {
      const { id } = await params;
      const body = await request.json();
      
      const adjustment = {
        itemId: ObjectId.isValid(id) ? new ObjectId(id) : id,
        itemName: body.itemName,
        type: body.type || 'adjustment',
        quantity: body.quantity,
        unit: body.unit,
        previousStock: body.previousStock,
        newStock: body.newStock,
        notes: body.notes,
        reference: body.reference,
        transactionId: body.transactionId || `adj-${Date.now()}`,
        performedBy: body.performedBy || 'Admin',
        createdAt: new Date()
      };

      const result = await db
        .collection(STOCK_ADJUSTMENT_COLLECTION)
        .insertOne(adjustment);

      return NextResponse.json({
        ...adjustment,
        _id: result.insertedId
      }, { status: 201 });

    } catch (error) {
      console.error('Error creating adjustment:', error);
      return NextResponse.json(
        { error: 'Failed to create adjustment' },
        { status: 500 }
      );
    }
  });
}