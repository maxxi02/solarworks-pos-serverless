import { NextRequest, NextResponse } from 'next/server';
import { MONGODB } from '@/config/db';

// Types
interface Ingredient {
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  supplier?: string;
  lastRestocked?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// GET all ingredients or filtered by category
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    
    const query: any = {};
    if (category) {
      query.category = category;
    }
    
    const ingredients = await MONGODB
      .collection('ingredients')
      .find(query)
      .sort({ name: 1 })
      .toArray();
    
    const formattedIngredients = ingredients.map((ing: any) => ({
      _id: ing._id.toString(),
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      currentStock: ing.currentStock,
      minStock: ing.minStock,
      costPerUnit: ing.costPerUnit,
      supplier: ing.supplier,
      lastRestocked: ing.lastRestocked,
      createdAt: ing.createdAt,
      updatedAt: ing.updatedAt
    }));
    
    return NextResponse.json(formattedIngredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}

// POST create new ingredient
export async function POST(request: NextRequest) {
  try {
    const body: Ingredient = await request.json();
    
    // Validation
    const errors: string[] = [];
    
    if (!body.name?.trim()) {
      errors.push('Ingredient name is required');
    }
    
    if (!body.category?.trim()) {
      errors.push('Category is required');
    }
    
    if (!body.unit?.trim()) {
      errors.push('Unit is required');
    }
    
    if (body.currentStock === undefined || isNaN(body.currentStock)) {
      errors.push('Current stock is required');
    }
    
    if (body.minStock === undefined || isNaN(body.minStock)) {
      errors.push('Minimum stock is required');
    }
    
    if (body.costPerUnit === undefined || isNaN(body.costPerUnit) || body.costPerUnit < 0) {
      errors.push('Valid cost per unit is required');
    }
    
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }
    
    // Check if ingredient already exists
    const existingIngredient = await MONGODB.collection('ingredients').findOne({
      name: { $regex: new RegExp(`^${body.name.trim()}$`, 'i') },
      category: body.category.trim()
    });
    
    if (existingIngredient) {
      return NextResponse.json(
        { error: 'Ingredient already exists in this category' },
        { status: 400 }
      );
    }
    
    // Create new ingredient
    const newIngredient: Ingredient = {
      name: body.name.trim(),
      category: body.category.trim(),
      unit: body.unit.trim(),
      currentStock: Number(body.currentStock),
      minStock: Number(body.minStock),
      costPerUnit: Number(body.costPerUnit),
      supplier: body.supplier?.trim(),
      lastRestocked: body.currentStock > 0 ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await MONGODB.collection('ingredients').insertOne(newIngredient);
    
    const createdIngredient = {
      _id: result.insertedId.toString(),
      ...newIngredient
    };
    
    return NextResponse.json(createdIngredient, { status: 201 });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to create ingredient' },
      { status: 500 }
    );
  }
}