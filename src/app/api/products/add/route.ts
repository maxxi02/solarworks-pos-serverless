import { NextRequest, NextResponse } from 'next/server';
import { MONGODB } from '@/config/db';
import { ObjectId } from 'mongodb';

interface IngredientInput {
  name?: string;
  quantity?: string;
  unit?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Processing product addition...');
    
    // Get and parse request body
    const requestText = await request.text();
    console.log('📦 Raw request:', requestText);
    
    let body;
    try {
      body = JSON.parse(requestText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('📝 Product data:', body);
    
    // Validation
    const errors: string[] = [];
    
    if (!body.name?.trim()) {
      errors.push('Product name is required');
    }
    
    const price = parseFloat(body.price);
    if (!body.price || isNaN(price) || price <= 0) {
      errors.push('Valid price is required (must be greater than 0)');
    }
    
    if (!body.categoryId) {
      errors.push('Category ID is required');
    }
    
    if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      errors.push('At least one ingredient is required');
    }
    
    if (errors.length > 0) {
      console.log('❌ Validation errors:', errors);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if category exists
    if (!ObjectId.isValid(body.categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID format' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const category = await MONGODB.collection('categories').findOne({
      _id: new ObjectId(body.categoryId)
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create product
    const newProduct = {
      name: body.name.trim(),
      price: price,
      description: body.description?.trim() || '',
      ingredients: body.ingredients.map((ing: IngredientInput) => ({
        name: ing.name?.trim() || '',
        quantity: ing.quantity || '',
        unit: ing.unit || 'grams'
      })),
      available: body.available !== undefined ? Boolean(body.available) : true,
      categoryId: body.categoryId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📝 Inserting product:', newProduct);
    
    const result = await MONGODB.collection('products').insertOne(newProduct);
    
    const response = {
      success: true,
      message: 'Product created successfully',
      data: {
        _id: result.insertedId.toString(),
        ...newProduct
      }
    };
    
    console.log('✅ Product created:', response.data._id);
    
    return NextResponse.json(response, {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    console.error('❌ POST Product Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}