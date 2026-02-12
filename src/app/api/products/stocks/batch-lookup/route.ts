import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/config/db-Connect';
import { 
  INVENTORY_COLLECTION, 
  Inventory,
  formatInventoryForDisplay
} from '@/models/Inventory';
import { 
  UnitCategory,
  getBaseUnit,
  Unit
} from '@/lib/unit-conversion';
import { ObjectId } from 'mongodb';

// ============================================================================
// TYPES
// ============================================================================

export interface LookupResponseItem {
  // ID as string (converted from ObjectId for frontend)
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
  
  // Additional display fields
  displayStock: string;
  displayMinStock: string;
  displayMaxStock: string;
  displayReorderPoint: string;
  compatibleUnits: string[];
  baseUnit: Unit;
  hasDensity: boolean;
}

export interface NotFoundItem {
  name: string;
  notFound: true;
  message: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert MongoDB document to LookupResponseItem
 */
function documentToLookupResponseItem(doc: any): LookupResponseItem {
  // Convert ObjectId to string
  const id = doc._id instanceof ObjectId 
    ? doc._id.toString() 
    : String(doc._id);
  
  // Parse dates
  const lastRestocked = doc.lastRestocked 
    ? new Date(doc.lastRestocked).toISOString() 
    : new Date().toISOString();
  
  const createdAt = doc.createdAt 
    ? new Date(doc.createdAt).toISOString() 
    : undefined;
  
  const updatedAt = doc.updatedAt 
    ? new Date(doc.updatedAt).toISOString() 
    : undefined;
  
  // Create base inventory object with string _id
  const inventoryItem: Inventory = {
    _id: doc._id, // Keep as ObjectId for internal use
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

  // Format for display
  const displayItem = formatInventoryForDisplay(inventoryItem);
  
  // Get compatible units
  const compatibleUnits = getCompatibleUnits(inventoryItem.unitCategory);
  
  // Check for density
  const hasDensity = !!(inventoryItem.density || false);

  // Return with string _id for frontend
  return {
    ...displayItem,
    _id: id, // String ID for frontend
    lastRestocked,
    createdAt,
    updatedAt,
    compatibleUnits,
    baseUnit: inventoryItem.unit,
    unitCategory: inventoryItem.unitCategory,
    hasDensity
  };
}

/**
 * Get compatible units for a given category
 */
function getCompatibleUnits(category: UnitCategory): string[] {
  const unitCategories = {
    weight: ['kg', 'g', 'lb', 'oz'],
    volume: ['L', 'mL', 'tsp', 'tbsp', 'cup', 'fl_oz', 'gal', 'qt', 'pt'],
    count: ['pieces', 'pcs', 'box', 'boxes', 'bottle', 'bottles', 'bag', 'bags', 'pack', 'packs', 'can', 'cans'],
    length: ['m', 'cm', 'mm', 'inch', 'in', 'ft']
  };

  return unitCategories[category] || [];
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST /api/products/stocks/batch-lookup
 * Lookup inventory items by names - RETURNS PLAIN ARRAY
 */
export async function POST(req: NextRequest) {
  return withDatabase(async (db) => {
    try {
      const body = await req.json();
      const { names } = body;
      
      if (!names || !Array.isArray(names)) {
        return NextResponse.json(
          { error: 'Invalid request: names array is required' },
          { status: 400 }
        );
      }

      if (names.length === 0) {
        return NextResponse.json([]); // ✅ Return empty array
      }

      // Clean and deduplicate names
      const uniqueNames = [...new Set(names.map(name => name.trim()))];

      // Find all inventory items with matching names (case-insensitive)
      const inventoryItems = await db
        .collection(INVENTORY_COLLECTION)
        .find({
          name: { 
            $in: uniqueNames.map(name => new RegExp(`^${name}$`, 'i'))
          }
        })
        .toArray();

      // Convert to response items
      const formattedItems: LookupResponseItem[] = inventoryItems.map(doc => 
        documentToLookupResponseItem(doc)
      );

      // ✅ Return plain array of found items (not wrapped in object)
      return NextResponse.json(formattedItems);

    } catch (error) {
      console.error('Error in batch lookup:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch inventory items',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/products/stocks/batch-lookup?ids=id1,id2,id3
 * Lookup inventory items by IDs - RETURNS PLAIN ARRAY
 */
export async function GET(req: NextRequest) {
  return withDatabase(async (db) => {
    try {
      const { searchParams } = new URL(req.url);
      const idsParam = searchParams.get('ids');
      const ids = idsParam ? idsParam.split(',') : [];
      
      if (ids.length === 0) {
        return NextResponse.json([]); // ✅ Return empty array
      }

      // Convert string IDs to ObjectIds
      const validIds = ids
        .filter(id => ObjectId.isValid(id))
        .map(id => new ObjectId(id));

      if (validIds.length === 0) {
        return NextResponse.json([]); // ✅ Return empty array
      }

      // Find items by ObjectIds
      const inventoryItems = await db
        .collection(INVENTORY_COLLECTION)
        .find({
          _id: { $in: validIds }
        })
        .toArray();

      // Convert to response items
      const formattedItems: LookupResponseItem[] = inventoryItems.map(doc => 
        documentToLookupResponseItem(doc)
      );

      // ✅ Return plain array of found items
      return NextResponse.json(formattedItems);

    } catch (error) {
      console.error('Error in batch lookup by IDs:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch inventory items',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  });
}