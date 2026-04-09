// app/api/payments/init/route.ts
import { NextResponse } from 'next/server';
import MONGODB from '@/config/db';

export async function GET() {
  try {
    const collection = MONGODB.collection('payments');
    
    // Create indexes
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ timestamp: -1 });
    await collection.createIndex({ orderNumber: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ paymentMethod: 1 });
    await collection.createIndex({ status: 1, paymentMethod: 1, createdAt: -1 });
    await collection.createIndex({ status: 1, timestamp: -1 });
    
    return NextResponse.json({
      success: true,
      message: 'Payments collection ready',
      indexes: [
        'createdAt', 'timestamp', 'orderNumber', 'status', 'paymentMethod',
        'status_paymentMethod_createdAt', 'status_timestamp'
      ]
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize'
    }, { status: 500 });
  }
}