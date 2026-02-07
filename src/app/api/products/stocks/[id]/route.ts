import { NextRequest, NextResponse } from 'next/server';
import { getInventoryCollection, createIdFilter } from '@/config/db-extended';

// GET single inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Note: params is now a Promise
) {
  try {
    const { id } = await params; // Await the params
    const collection = await getInventoryCollection();
    const filter = createIdFilter(id);
    const item = await collection.findOne(filter);

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    );
  }
}

// PUT update inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await the params
    const body = await request.json();
    const collection = await getInventoryCollection();

    const updateData = {
      ...body,
      updatedAt: new Date()
    };

    const filter = createIdFilter(id);
    const result = await collection.updateOne(
      filter,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

// DELETE inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await the params
    const collection = await getInventoryCollection();
    const filter = createIdFilter(id);
    const result = await collection.deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}