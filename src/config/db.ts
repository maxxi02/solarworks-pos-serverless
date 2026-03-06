// src/config/db.ts
import { Db, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;

if (!uri) {
  throw new Error("MONGODB_URI environment variable is not defined");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  // In dev, reuse the same client across hot-reloads
  if (!globalThis._mongoClient) {
    globalThis._mongoClient = new MongoClient(uri);
    globalThis._mongoClient.connect();
  }
  client = globalThis._mongoClient;
} else {
  // In production, create a new client
  client = new MongoClient(uri);
  client.connect();
}

/**
 * Returns the connected Db instance.
 * Call this in API routes to ensure connection is shared.
 */
export async function getDb(): Promise<Db> {
  // MongoClient auto-connects if explicitly told to, or on first op.
  // We ensure it's connected here.
  return client.db();
}

// Legacy synchronous export kept for compatibility.
// MongoClient handles internal connection pooling.
export const CLIENT: MongoClient = client;
export const MONGODB: Db = client.db();

/**
 * Initialize database indexes for performance
 */
export async function initIndexes() {
  try {
    const db = MONGODB;
    
    // Payments collection indexes
    await db.collection('payments').createIndex({ createdAt: -1 });
    await db.collection('payments').createIndex({ status: 1 });
    await db.collection('payments').createIndex({ orderNumber: 1 });
    await db.collection('payments').createIndex({ timestamp: -1 });
    
    // Inventory collection indexes
    await db.collection('inventory').createIndex({ name: 1 });
    await db.collection('inventory').createIndex({ status: 1 });
    await db.collection('inventory').createIndex({ category: 1 });
    
    // Stock adjustments indexes
    await db.collection('stockAdjustments').createIndex({ itemId: 1, createdAt: -1 });
    await db.collection('stockAdjustments').createIndex({ transactionId: 1 });
    
    console.log('✅ Database indexes initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize indexes:', error);
  }
}

// Initialize indexes
initIndexes().catch(console.error);

export default MONGODB;
