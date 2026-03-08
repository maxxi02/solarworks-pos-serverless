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
  const db = MONGODB;

  const createIdx = async (col: string, spec: any, options?: any) => {
    try {
      await db.collection(col).createIndex(spec, options);
    } catch (err: any) {
      // Ignore IndexKeySpecsConflict or identical index already exists
      if (err.code !== 86 && err.code !== 85) {
        console.warn(`⚠️ Could not create index on ${col}:`, err.message);
      }
    }
  };

  try {
    // Payments
    await createIdx("payments", { createdAt: -1 });
    await createIdx("payments", { status: 1 });
    await createIdx("payments", { orderNumber: 1 });
    await createIdx("payments", { timestamp: -1 });

    // Inventory
    await createIdx("inventory", { name: 1 });
    await createIdx("inventory", { status: 1 });
    await createIdx("inventory", { category: 1 });

    // Attendance
    await createIdx("attendance", { userId: 1, date: -1 });
    await createIdx("attendance", { status: 1 });
    await createIdx("attendance", { clockInTime: -1 });

    // Attendance Temp (Pending)
    await createIdx("attendance_temp", { userId: 1, date: -1 });
    await createIdx("attendance_temp", { status: 1 });
    await createIdx("attendance_temp", { clockInTime: -1 });

    // Stock adjustments
    await createIdx("stockAdjustments", { itemId: 1, createdAt: -1 });
    await createIdx("stockAdjustments", { transactionId: 1 });

    console.log("✅ Database indexes checked/initialized");
  } catch (error) {
    console.warn("⚠️ Failed to initialize indexes:", error);
  }
}

// Initialize indexes
initIndexes().catch(console.error);

export default MONGODB;
