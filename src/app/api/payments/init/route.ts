// app/api/payments/init/route.ts
import { NextResponse } from 'next/server';
import MONGODB from '@/config/db';

export async function GET() {
  try {
    const collection = MONGODB.collection('payments');
    
    // Create indexes
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ orderNumber: 1 }, { unique: true });
    
    return NextResponse.json({
      success: true,
      message: 'Payments collection ready',
      indexes: ['createdAt', 'orderNumber']
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize'
    }, { status: 500 });
  }
}