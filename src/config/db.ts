// Singleton MongoDB client with connection caching for Next.js serverless.
// Stores the client promise on globalThis so it survives hot-reloads in dev
// and is shared across invocations in the same serverless instance.

import { Db, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;

if (!uri) {
  throw new Error("MONGODB_URI environment variable is not defined");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In dev, reuse the same promise across hot-reloads
  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = globalThis._mongoClientPromise;
} else {
  // In production, always create a new promise (each instance is isolated)
  clientPromise = new MongoClient(uri).connect();
}

// Returns the connected Db — call this in every API route
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db();
}

// Legacy synchronous export kept for backwards compatibility.
// Routes that import MONGODB directly will still work because MongoClient
// auto-connects lazily on first operation when a connection is cached in the pool.
const legacyClient = new MongoClient(uri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 10000,
});
legacyClient.connect().catch(() => {/* handled per-request */});

export const MONGODB: Db = legacyClient.db();
export default MONGODB;