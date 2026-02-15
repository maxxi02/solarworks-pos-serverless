// app/api/receipts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/config/db-Connect';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ObjectId } from 'mongodb';

// Collection name
const COLLECTION = 'receipts';

export async function POST(request: NextRequest) {
  console.log('📝 POST /api/receipts - Started');
  
  try {
    console.log('🔐 Attempting to get session...');
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      console.log('❌ Unauthorized - No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Session found:', session.user?.email);

    // Connect to database
    const db = await connectToDatabase();
    console.log('✅ Database connected');
    
    const data = await request.json();
    console.log('📦 Received receipt data');

    // Add cashier info from session
    data.cashier = session.user?.name || 'Unknown';
    data.cashierId = session.user?.id;

    // Generate order number if not provided
    if (!data.orderNumber) {
      const date = new Date();
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get collection
      const collection = db.collection(COLLECTION);
      
      const count = await collection.countDocuments({
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      });
      
      data.orderNumber = `ORD-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;
    }

    // Calculate tax (12% VAT)
    data.taxAmount = data.total * 0.12;
    
    // Add timestamps
    data.createdAt = new Date();
    data.updatedAt = new Date();

    // Get collection and insert
    const collection = db.collection(COLLECTION);
    const result = await collection.insertOne(data);
    
    console.log('✅ Receipt created successfully with ID:', result.insertedId);

    // Return the created receipt (without _id)
    const { _id, ...receiptWithoutId } = { ...data, _id: result.insertedId };

    return NextResponse.json({ 
      success: true, 
      receipt: receiptWithoutId,
      orderNumber: data.orderNumber 
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Failed to create receipt:', error);
    return NextResponse.json({ 
      error: 'Failed to create receipt',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('📋 GET /api/receipts - Started');
  
  try {
    console.log('🔐 Attempting to get session...');
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      console.log('❌ Unauthorized - No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    const db = await connectToDatabase();
    console.log('✅ Database connected');
    
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const orderNumber = searchParams.get('orderNumber');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query: any = {};
    
    if (orderNumber) {
      query.orderNumber = orderNumber;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (page - 1) * limit;

    // Get collection
    const collection = db.collection(COLLECTION);
    
    // Get receipts with pagination
    const [receipts, total] = await Promise.all([
      collection.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query)
    ]);

    // Remove _id from each receipt for the response
    const receiptsWithoutId = receipts.map(receipt => {
      const { _id, ...rest } = receipt;
      return rest;
    });

    console.log(`✅ Found ${receipts.length} receipts (total: ${total})`);

    return NextResponse.json({
      receipts: receiptsWithoutId,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch receipts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch receipts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}