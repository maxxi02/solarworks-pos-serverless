import { NextRequest, NextResponse } from 'next/server';
import { MONGODB } from '@/config/db';
import { ObjectId } from 'mongodb';

// Helper function
const handleError = (error: unknown, message: string) => {
  console.error(`${message}:`, error);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
};

export async function GET() {
  try {
    const items = await MONGODB.collection('menu_items').find({}).toArray();
    const data = items.map(item => ({ ...item, _id: item._id.toString() }));
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleError(error, 'Failed to fetch items');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name?.trim() || !body.categoryId) {
      return NextResponse.json({ success: false, error: 'Name and category required' }, { status: 400 });
    }

    const price = parseFloat(body.price);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ success: false, error: 'Valid price required' }, { status: 400 });
    }

    const item = {
      name: body.name.trim(),
      price,
      description: body.description?.trim() || '',
      categoryId: body.categoryId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await MONGODB.collection('menu_items').insertOne(item);
    
    return NextResponse.json({ 
      success: true, 
      data: { ...item, _id: result.insertedId.toString() } 
    }, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create item');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const updateData = { ...body, updatedAt: new Date() };
    const result = await MONGODB.collection('menu_items').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { _id: id, ...updateData } });
  } catch (error) {
    return handleError(error, 'Failed to update item');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const result = await MONGODB.collection('menu_items').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    return handleError(error, 'Failed to delete item');
  }
}