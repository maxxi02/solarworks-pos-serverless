import { NextRequest, NextResponse } from 'next/server';
import { getStockAdjustmentsCollection } from '@/config/db-extended';

// GET stock adjustments for an item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await the params
    const collection = await getStockAdjustmentsCollection();
    const adjustments = await collection
      .find({ itemId: id })
      .sort({ date: -1 })
      .toArray();

    return NextResponse.json(adjustments);
  } catch (error) {
    console.error('Error fetching adjustments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch adjustments' },
      { status: 500 }
    );
  }
}