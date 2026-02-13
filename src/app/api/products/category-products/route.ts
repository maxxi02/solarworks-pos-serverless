// File: src/app/api/products/category-products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MONGODB } from '@/config/db';
import { ObjectId } from 'mongodb';

// GET all products from products collection (NOT category-products)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');
    const available = url.searchParams.get('available');
    const search = url.searchParams.get('search');
    
    let query: any = {};
    
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    if (available !== null) {
      query.available = available === 'true';
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // ✅ CORRECT: Use 'products' collection to match categories API
    const products = await MONGODB.collection('products')
      .find(query)
      .sort({ name: 1 })
      .toArray();
    
    const formattedProducts = products.map((product: any) => ({
      _id: product._id.toString(),
      name: product.name,
      price: product.price,
      description: product.description || '',
      ingredients: product.ingredients?.map((ing: any) => ({
        inventoryItemId: ing.inventoryItemId || '',
        name: ing.name,
        quantity: typeof ing.quantity === 'string' ? Number(ing.quantity) : ing.quantity,
        unit: ing.unit
      })) || [],
      available: product.available !== undefined ? product.available : true,
      categoryId: product.categoryId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));
    
    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST create new product in products collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation
    const errors: string[] = [];
    
    if (!body.name?.trim()) {
      errors.push('Product name is required');
    }
    
    if (!body.price || isNaN(Number(body.price)) || Number(body.price) <= 0) {
      errors.push('Valid price is required');
    }
    
    if (!body.categoryId?.trim()) {
      errors.push('Category ID is required');
    }
    
    // Check if category exists
    if (!ObjectId.isValid(body.categoryId)) {
      errors.push('Invalid category ID');
    } else {
      const category = await MONGODB.collection('categories').findOne({
        _id: new ObjectId(body.categoryId)
      });
      if (!category) {
        errors.push('Category not found');
      }
    }
    
    // Validate ingredients
    if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      errors.push('At least one ingredient is required');
    } else {
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
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }
    
    // Process ingredients
    const ingredients = body.ingredients.map((ing: any) => ({
      inventoryItemId: ing.inventoryItemId.trim(),
      name: ing.name.trim(),
      quantity: Number(ing.quantity),
      unit: ing.unit.trim()
    }));
    
    const newProduct = {
      name: body.name.trim(),
      price: Number(body.price),
      description: body.description?.trim() || '',
      ingredients: ingredients,
      available: body.available !== undefined ? Boolean(body.available) : true,
      categoryId: body.categoryId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // ✅ CORRECT: Insert into 'products' collection to match categories API
    const result = await MONGODB.collection('products').insertOne(newProduct);
    
    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...newProduct
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}