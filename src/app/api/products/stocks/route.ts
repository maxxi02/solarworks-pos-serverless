import { NextRequest, NextResponse } from 'next/server';
import { getInventoryCollection } from '@/config/db-extended';
import { ObjectId } from 'mongodb';

// GET all inventory items
export async function GET(request: NextRequest) {
  try {
    const collection = await getInventoryCollection();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query: any = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } }
      ];
    }

    const inventory = await collection.find(query).sort({ status: 1, name: 1 }).toArray();
    
    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// POST create new inventory item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const collection = await getInventoryCollection();

    const newItem = {
      ...body,
      currentStock: Number(body.currentStock),
      minStock: Number(body.minStock),
      maxStock: Number(body.maxStock) || Number(body.minStock) * 3,
      pricePerUnit: Number(body.pricePerUnit) || 0,
      reorderPoint: Number(body.reorderPoint) || Math.ceil(Number(body.minStock) * 1.5),
      status: 'ok',
      lastRestocked: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newItem);
    
    return NextResponse.json(
      { 
        _id: result.insertedId,
        ...newItem
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}