import { NextRequest, NextResponse } from 'next/server';
import { MONGODB } from '@/config/db';
import { ObjectId } from 'mongodb';

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface MongoDBProduct {
  _id: ObjectId;
  name: string;
  price: number;
  description: string;
  ingredients: Ingredient[];
  available: boolean;
  categoryId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MongoDBCategory {
  _id: ObjectId;
  name: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function GET() {
  try {
    console.log('🔍 Fetching categories...');
    
    const categories = await MONGODB.collection('categories')
      .find({})
      .sort({ createdAt: -1 })
      .toArray() as MongoDBCategory[];
    console.log(`📊 Found ${categories.length} categories`);
    
    const products = await MONGODB.collection('products').find({}).toArray() as MongoDBProduct[];
    console.log(`📊 Found ${products.length} products`);
    
    const categoriesWithProducts = categories.map((category: MongoDBCategory) => ({
      _id: category._id.toString(),
      name: category.name,
      description: category.description || '',
      products: products
        .filter((p: MongoDBProduct) => p.categoryId === category._id.toString())
        .map((p: MongoDBProduct) => ({
          _id: p._id.toString(),
          name: p.name,
          price: p.price,
          description: p.description || '',
          ingredients: p.ingredients || [],
          available: p.available !== undefined ? p.available : true,
          categoryId: p.categoryId
        })),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }));
    
    console.log('✅ Categories fetched successfully');
    return NextResponse.json(categoriesWithProducts);
    
  } catch (error: unknown) {
    console.error('❌ GET Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch categories',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Adding category:', body);
    
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    const newCategory = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await MONGODB.collection('categories').insertOne(newCategory);
    console.log('✅ Category created:', result.insertedId);
    
    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...newCategory,
      products: []
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ POST Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create category',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}