import { Db } from "mongodb";
import { MONGODB } from './db'; // Change to relative import, not @/config/db

export const db = MONGODB;

let isConnected = false;
let connectionPromise: Promise<Db> | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (isConnected && db) {
    return db;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      await db.command({ ping: 1 });
      isConnected = true;
      console.log('✅ Database connected successfully');
      return db;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw new Error('Failed to connect to database');
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

export async function withDatabase<T>(
  operation: (db: Db) => Promise<T>
): Promise<T> {
  await connectToDatabase();
  return operation(db);
}

export async function withTransaction<T>(
  operation: (session: any) => Promise<T>
): Promise<T> {
  await connectToDatabase();
  
  const client = (db as any).client;
  if (!client) {
    return operation({ client: { db: () => db } });
  }
  
  const session = client.startSession();
  
  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}