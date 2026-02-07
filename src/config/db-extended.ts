import { MONGODB } from './db';
import { ObjectId, Filter } from 'mongodb';

export async function getInventoryCollection() {
  return MONGODB.collection('inventory');
}

export async function getStockAdjustmentsCollection() {
  return MONGODB.collection('stockAdjustments');
}

// Helper to convert string to ObjectId
export function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch (error) {
    // If it's already an ObjectId string or invalid, create new
    return new ObjectId();
  }
}

// Helper for filter queries
export function createIdFilter(id: string): Filter<any> {
  try {
    // Try to parse as ObjectId
    const objectId = new ObjectId(id);
    return { _id: objectId };
  } catch {
    // If not a valid ObjectId, use string
    return { _id: id };
  }
}