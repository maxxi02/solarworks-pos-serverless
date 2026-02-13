import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/config/db-Connect'; // Change from '@config' to '@/config'
import { 
  INVENTORY_COLLECTION, 
  Inventory,
  createInventoryItem, 
  updateInventoryItem 
} from '@/models/Inventory';
import { ObjectId } from 'mongodb';

// GET all inventory items
export async function GET(request: NextRequest) {
  return withDatabase(async (db) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const category = searchParams.get('category');
      const status = searchParams.get('status');
      const search = searchParams.get('search');

      let query: any = {};

      if (category && category !== 'all') {
        query.category = category;
      }

      if (status && status !== 'all') {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { supplier: { $regex: search, $options: 'i' } }
        ];
      }

      const inventory = await db
        .collection<Inventory>(INVENTORY_COLLECTION) // Add type parameter here
        .find(query)
        .sort({ status: 1, name: 1 })
        .toArray();
      
      return NextResponse.json(inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return NextResponse.json(
        { error: 'Failed to fetch inventory' },
        { status: 500 }
      );
    }
  });
}

// POST create new inventory item
export async function POST(request: NextRequest) {
  return withDatabase(async (db) => {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.name || !body.category || body.currentStock === undefined || !body.minStock) {
        return NextResponse.json(
          { error: 'Missing required fields: name, category, currentStock, and minStock are required' },
          { status: 400 }
        );
      }

      // Check if item with same name already exists (case insensitive)
      const existing = await db.collection<Inventory>(INVENTORY_COLLECTION).findOne({
        name: { $regex: new RegExp(`^${body.name}$`, 'i') }
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Item with this name already exists' },
          { status: 409 }
        );
      }

      // Create inventory item using the helper function
      const newItem = createInventoryItem({
        name: body.name,
        category: body.category,
        currentStock: Number(body.currentStock),
        minStock: Number(body.minStock),
        maxStock: body.maxStock ? Number(body.maxStock) : undefined,
        unit: body.unit || 'pieces',
        supplier: body.supplier || 'Unknown',
        pricePerUnit: body.pricePerUnit ? Number(body.pricePerUnit) : 0,
        location: body.location || 'Unassigned',
        reorderPoint: body.reorderPoint ? Number(body.reorderPoint) : undefined,
        icon: body.icon || 'package'
      });

      const result = await db.collection(INVENTORY_COLLECTION).insertOne(newItem);
      
      return NextResponse.json(
        { 
          ...newItem,
          _id: result.insertedId
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating inventory item:', error);
      return NextResponse.json(
        { error: 'Failed to create inventory item' },
        { status: 500 }
      );
    }
  });
}

// PUT update inventory item
export async function PUT(request: NextRequest) {
  return withDatabase(async (db) => {
    try {
      const body = await request.json();
      const { id, ...updates } = body;
      
      if (!id) {
        return NextResponse.json(
          { error: 'ID is required' },
          { status: 400 }
        );
      }

      // Validate ID format
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { error: 'Invalid ID format' },
          { status: 400 }
        );
      }
      
      // Get existing item - type assertion to Inventory
      const existing = await db.collection<Inventory>(INVENTORY_COLLECTION).findOne({
        _id: new ObjectId(id)
      }) as Inventory | null;
      
      if (!existing) {
        return NextResponse.json(
          { error: 'Item not found' },
          { status: 404 }
        );
      }
      
      // Check if trying to update name to an existing name
      if (updates.name && updates.name.toLowerCase() !== existing.name.toLowerCase()) {
        const nameExists = await db.collection<Inventory>(INVENTORY_COLLECTION).findOne({
          name: { $regex: new RegExp(`^${updates.name}$`, 'i') },
          _id: { $ne: new ObjectId(id) }
        });

        if (nameExists) {
          return NextResponse.json(
            { error: 'Item with this name already exists' },
            { status: 409 }
          );
        }
      }
      
      // Prepare updates with number conversions
      const preparedUpdates: any = { ...updates };
      
      if (updates.currentStock !== undefined) {
        preparedUpdates.currentStock = Number(updates.currentStock);
      }
      if (updates.minStock !== undefined) {
        preparedUpdates.minStock = Number(updates.minStock);
      }
      if (updates.maxStock !== undefined) {
        preparedUpdates.maxStock = Number(updates.maxStock);
      }
      if (updates.pricePerUnit !== undefined) {
        preparedUpdates.pricePerUnit = Number(updates.pricePerUnit);
      }
      if (updates.reorderPoint !== undefined) {
        preparedUpdates.reorderPoint = Number(updates.reorderPoint);
      }
      
      // Calculate updates with status using helper function
      const updatedData = updateInventoryItem(existing, preparedUpdates);
      
      await db.collection(INVENTORY_COLLECTION).updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      
      const updated = await db.collection<Inventory>(INVENTORY_COLLECTION).findOne({
        _id: new ObjectId(id)
      });
      
      return NextResponse.json(updated);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      return NextResponse.json(
        { error: 'Failed to update inventory item' },
        { status: 500 }
      );
    }
  });
}

// DELETE inventory item
export async function DELETE(request: NextRequest) {
  return withDatabase(async (db) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      
      if (!id) {
        return NextResponse.json(
          { error: 'ID is required' },
          { status: 400 }
        );
      }

      // Validate ID format
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { error: 'Invalid ID format' },
          { status: 400 }
        );
      }
      
      // Check if item exists - type assertion to Inventory
      const existing = await db.collection<Inventory>(INVENTORY_COLLECTION).findOne({
        _id: new ObjectId(id)
      }) as Inventory | null;

      if (!existing) {
        return NextResponse.json(
          { error: 'Item not found' },
          { status: 404 }
        );
      }
      
      // Optional: Check if item has any stock adjustment history
      const hasAdjustments = await db.collection('stockAdjustments')
        .findOne({ itemId: new ObjectId(id) });
      
      if (hasAdjustments) {
        // Instead of deleting, you might want to archive or mark as inactive
        // For now, we'll still delete but log a warning
        console.warn(`Deleting item ${id} (${existing.name}) that has adjustment history`);
      }
      
      const result = await db.collection(INVENTORY_COLLECTION).deleteOne({
        _id: new ObjectId(id)
      });
      
      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: 'Item not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Item deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      return NextResponse.json(
        { error: 'Failed to delete inventory item' },
        { status: 500 }
      );
    }
  });
}