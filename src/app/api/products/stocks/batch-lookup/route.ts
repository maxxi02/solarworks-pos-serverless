import { NextRequest, NextResponse } from 'next/server';
import MONGODB from '@/config/db';
import { 
  INVENTORY_COLLECTION, 
  Inventory,
  formatInventoryForDisplay
} from '@/models/Inventory';
import { 
  UnitCategory,
  Unit
} from '@/lib/unit-conversion';
import { ObjectId } from 'mongodb';

export interface LookupResponseItem {
  _id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: Unit;
  displayUnit: Unit;
  unitCategory: UnitCategory;
  density?: number;
  supplier: string;
  lastRestocked: string | Date;
  pricePerUnit: number;
  location: string;
  reorderPoint: number;
  icon: string;
  status: 'critical' | 'low' | 'warning' | 'ok';
  createdAt?: string | Date;
  updatedAt?: string | Date;
  displayStock: string;
  displayMinStock: string;
  displayMaxStock: string;
  displayReorderPoint: string;
  compatibleUnits: string[];
  baseUnit: Unit;
  hasDensity: boolean;
}

function documentToLookupResponseItem(doc: any): LookupResponseItem {
  const id = doc._id instanceof ObjectId ? doc._id.toString() : String(doc._id);
  
  const lastRestocked = doc.lastRestocked 
    ? new Date(doc.lastRestocked).toISOString() 
    : new Date().toISOString();
  
  const createdAt = doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined;
  const updatedAt = doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined;
  
  const inventoryItem: Inventory = {
    _id: doc._id,
    name: doc.name || '',
    category: doc.category || '',
    currentStock: Number(doc.currentStock) || 0,
    minStock: Number(doc.minStock) || 0,
    maxStock: Number(doc.maxStock) || 0,
    unit: doc.unit || 'g',
    displayUnit: doc.displayUnit || doc.unit || 'g',
    unitCategory: doc.unitCategory || 'weight',
    density: doc.density,
    supplier: doc.supplier || 'Unknown',
    lastRestocked: new Date(doc.lastRestocked || Date.now()),
    pricePerUnit: Number(doc.pricePerUnit) || 0,
    location: doc.location || 'Unassigned',
    reorderPoint: Number(doc.reorderPoint) || 0,
    icon: doc.icon || 'package',
    status: doc.status || 'ok',
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date()
  };

  const displayItem = formatInventoryForDisplay(inventoryItem);
  const compatibleUnits = getCompatibleUnits(inventoryItem.unitCategory);
  const hasDensity = !!(inventoryItem.density || false);

  return {
    ...displayItem,
    _id: id,
    lastRestocked,
    createdAt,
    updatedAt,
    compatibleUnits,
    baseUnit: inventoryItem.unit,
    unitCategory: inventoryItem.unitCategory,
    hasDensity
  };
}

function getCompatibleUnits(category: UnitCategory): string[] {
  const unitCategories = {
    weight: ['kg', 'g', 'lb', 'oz'],
    volume: ['L', 'mL', 'tsp', 'tbsp', 'cup', 'fl_oz', 'gal', 'qt', 'pt'],
    count: ['pieces', 'pcs', 'box', 'boxes', 'bottle', 'bottles', 'bag', 'bags', 'pack', 'packs', 'can', 'cans'],
    length: ['m', 'cm', 'mm', 'inch', 'in', 'ft']
  };

  return unitCategories[category] || [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { names } = body;
    
    if (!names || !Array.isArray(names)) {
      return NextResponse.json({ error: 'Invalid request: names array is required' }, { status: 400 });
    }

    if (names.length === 0) return NextResponse.json([]);

    const uniqueNames = [...new Set(names.map(name => name.trim()))];

    const inventoryItems = await MONGODB
      .collection(INVENTORY_COLLECTION)
      .find({
        name: { $in: uniqueNames.map(name => new RegExp(`^${name}$`, 'i')) }
      })
      .toArray();

    return NextResponse.json(inventoryItems.map(doc => documentToLookupResponseItem(doc)));

  } catch (error) {
    console.error('Error in batch lookup:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',') : [];
    
    if (ids.length === 0) return NextResponse.json([]);

    const validIds = ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

    if (validIds.length === 0) return NextResponse.json([]);

    const inventoryItems = await MONGODB
      .collection(INVENTORY_COLLECTION)
      .find({ _id: { $in: validIds } })
      .toArray();

    return NextResponse.json(inventoryItems.map(doc => documentToLookupResponseItem(doc)));

  } catch (error) {
    console.error('Error in batch lookup by IDs:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}