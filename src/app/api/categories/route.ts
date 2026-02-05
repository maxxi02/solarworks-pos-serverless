import { NextRequest, NextResponse } from 'next/server';
import { MONGODB } from '@/config/db';
import { ObjectId } from 'mongodb';

// Helper function
const handleError = (error: unknown, message: string) => {
  console.error(`${message}:`, error);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
      }
      
      const category = await MONGODB.collection('categories').findOne({ _id: new ObjectId(id) });
      if (!category) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      
      return NextResponse.json({ 
        success: true, 
        data: { ...category, _id: category._id.toString() } 
      });
    }
    
    const categories = await MONGODB.collection('categories').find({}).toArray();
    const data = categories.map(c => ({ ...c, _id: c._id.toString() }));
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleError(error, 'Failed to fetch categories');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name required' }, { status: 400 });
    }

    const category = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      icon: body.icon || 'Espresso',
      color: body.color || 'bg-blue-500',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await MONGODB.collection('categories').insertOne(category);
    
    return NextResponse.json({ 
      success: true, 
      data: { ...category, _id: result.insertedId.toString() } 
    }, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create category');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    await MONGODB.collection('menu_items').deleteMany({ categoryId: id });
    const result = await MONGODB.collection('categories').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    return handleError(error, 'Failed to delete category');
  }
}