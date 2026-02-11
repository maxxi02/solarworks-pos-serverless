// File: src/app/api/products/add/route.ts (UPDATED)
import { NextRequest, NextResponse } from 'next/server';
import { MONGODB } from '@/config/db';
import { ObjectId } from 'mongodb';

// New interface for product ingredients
interface ProductIngredient {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unit: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Processing product addition with inventory integration...');
    
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
    
    // UPDATED: Validate ingredients with new structure
    if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      errors.push('At least one ingredient is required');
    } else {
      // Validate each ingredient with new structure
      body.ingredients.forEach((ing: any, index: number) => {
        if (!ing.inventoryItemId?.trim()) {
          errors.push(`Ingredient ${index + 1}: Inventory item ID is required`);
        }
        if (!ing.name?.trim()) {
          errors.push(`Ingredient ${index + 1}: Name is required`);
        }
        if (!ing.quantity || isNaN(Number(ing.quantity)) || Number(ing.quantity) <= 0) {
          errors.push(`Ingredient ${index + 1}: Valid quantity is required`);
        }
        if (!ing.unit?.trim()) {
          errors.push(`Ingredient ${index + 1}: Unit is required`);
        }
      });
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
    
    // UPDATED: Check if inventory items exist
    const inventoryItemIds = body.ingredients
      .map((ing: ProductIngredient) => ing.inventoryItemId)
      .filter((id: string) => ObjectId.isValid(id));
    
    if (inventoryItemIds.length > 0) {
      const inventoryItems = await MONGODB.collection('stocks').find({
        _id: { $in: inventoryItemIds.map((id: string) => new ObjectId(id)) }
      }).toArray();
      
      // Verify all inventory items exist
      const foundIds = inventoryItems.map(item => item._id.toString());
      const missingIds = inventoryItemIds.filter((id: string) => !foundIds.includes(id));
      
      if (missingIds.length > 0) {
        return NextResponse.json(
          { 
            error: 'Some inventory items not found',
            details: `Missing inventory item IDs: ${missingIds.join(', ')}`
          },
          { status: 404 }
        );
      }
    }
    
    // UPDATED: Create product with new ingredient structure
    const newProduct = {
      name: body.name.trim(),
      price: price,
      description: body.description?.trim() || '',
      ingredients: body.ingredients.map((ing: ProductIngredient) => ({
        inventoryItemId: ing.inventoryItemId.trim(),
        name: ing.name.trim(),
        quantity: Number(ing.quantity), // Ensure it's a number
        unit: ing.unit.trim()
      })),
      available: body.available !== undefined ? Boolean(body.available) : true,
      categoryId: body.categoryId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📝 Inserting product with inventory integration:', newProduct);
    
    const result = await MONGODB.collection('products').insertOne(newProduct);
    
    const response = {
      success: true,
      message: 'Product created successfully with inventory integration',
      data: {
        _id: result.insertedId.toString(),
        ...newProduct
      }
    };
    
    console.log('✅ Product created with inventory links:', response.data._id);
    
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