import { NextRequest, NextResponse } from 'next/server';
import { getInventoryCollection, getStockAdjustmentsCollection, createIdFilter } from '@/config/db-extended';

// POST stock adjustment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // <-- params is now a Promise
) {
  try {
    // Await the params first
    const { id } = await params; // <-- Add this line
    
    const body = await request.json();
    const { type, quantity, notes, performedBy = 'System' } = body;

    // Validate quantity
    if (!quantity || quantity <= 0 || quantity > 100000) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 100,000' },
        { status: 400 }
      );
    }

    const inventoryCollection = await getInventoryCollection();
    const adjustmentsCollection = await getStockAdjustmentsCollection();

    // Get current item - use the awaited id
    const filter = createIdFilter(id); // <-- Changed from params.id to id
    const item = await inventoryCollection.findOne(filter);
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    let newStock = item.currentStock;
    const previousStock = item.currentStock;

    // Calculate new stock based on adjustment type
    switch (type) {
      case 'restock':
        newStock += quantity;
        if (newStock > 100000) {
          return NextResponse.json(
            { error: 'Stock cannot exceed 100,000 units' },
            { status: 400 }
          );
        }
        break;
      case 'usage':
      case 'waste':
        newStock = Math.max(0, newStock - quantity);
        break;
      case 'correction':
        if (quantity > 100000) {
          return NextResponse.json(
            { error: 'Stock cannot exceed 100,000 units' },
            { status: 400 }
          );
        }
        newStock = quantity;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid adjustment type' },
          { status: 400 }
        );
    }

    // Update item stock
    const updateData: any = {
      currentStock: newStock,
      updatedAt: new Date()
    };

    if (type === 'restock') {
      updateData.lastRestocked = new Date();
    }

    // Update status based on new stock
    const percentage = (newStock / item.minStock) * 100;
    if (newStock <= item.minStock * 0.3) {
      updateData.status = 'critical';
    } else if (newStock <= item.minStock * 0.5) {
      updateData.status = 'low';
    } else if (newStock <= item.minStock) {
      updateData.status = 'warning';
    } else {
      updateData.status = 'ok';
    }

    await inventoryCollection.updateOne(
      filter,
      { $set: updateData }
    );

    // Record adjustment - use the awaited id
    const adjustment = {
      itemId: id, // <-- Changed from params.id to id
      itemName: item.name,
      type,
      quantity,
      unit: item.unit,
      date: new Date(),
      notes: notes || '',
      performedBy,
      previousStock,
      newStock,
      createdAt: new Date()
    };

    await adjustmentsCollection.insertOne(adjustment);

    return NextResponse.json({
      success: true,
      newStock,
      status: updateData.status
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}