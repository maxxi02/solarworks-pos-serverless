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
export const MONGODB: Db = client.db();
export default MONGODB;
