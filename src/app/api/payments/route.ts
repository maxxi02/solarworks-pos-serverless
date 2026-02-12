// app/api/payments/route.ts
import { NextResponse } from 'next/server';
import MONGODB from '@/config/db';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const paymentData = {
      ...body,
      _id: new ObjectId(),
      createdAt: new Date()
    };
    
    const result = await MONGODB.collection('payments').insertOne(paymentData);
    
    return NextResponse.json({
      success: true,
      data: paymentData
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to save payment'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;
    
    const payments = await MONGODB.collection('payments')
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const total = await MONGODB.collection('payments').countDocuments();
    
    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        total,
        limit,
        skip
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payments'
    }, { status: 500 });
  }
}