// File: src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MONGODB } from '@/config/db';
import { ObjectId } from 'mongodb';

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

// GET single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await the params
    
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }
    
    const product = await MONGODB.collection('products').findOne({
      _id: new ObjectId(id)
    });
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    const formattedProduct = {
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
    };
    
    return NextResponse.json(formattedProduct);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await the params
    const body = await request.json();
    
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }
    
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
    if (!isValidObjectId(body.categoryId)) {
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
    
    // Check if product exists
    const existingProduct = await MONGODB.collection('products').findOne({
      _id: new ObjectId(id)
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Process ingredients
    const ingredients = body.ingredients.map((ing: any) => ({
      inventoryItemId: ing.inventoryItemId.trim(),
      name: ing.name.trim(),
      quantity: Number(ing.quantity),
      unit: ing.unit.trim()
    }));
    
    const updateData = {
      name: body.name.trim(),
      price: Number(body.price),
      description: body.description?.trim() || '',
      ingredients: ingredients,
      available: body.available !== undefined ? Boolean(body.available) : true,
      categoryId: body.categoryId,
      updatedAt: new Date()
    };
    
    const result = await MONGODB.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      _id: id,
      ...updateData,
      createdAt: existingProduct.createdAt
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await the params
    
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }
    
    // Check if product exists
    const existingProduct = await MONGODB.collection('products').findOne({
      _id: new ObjectId(id)
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    const result = await MONGODB.collection('products').deleteOne({
      _id: new ObjectId(id)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Product deleted successfully',
      deletedProduct: {
        id,
        name: existingProduct.name
      }
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}