import { NextRequest, NextResponse } from 'next/server';
import MONGODB from '@/config/db';
import { STOCK_ADJUSTMENT_COLLECTION } from '@/models/StockAdjustments';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    const itemId = searchParams.get('itemId');
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const referenceType = searchParams.get('referenceType');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: any = {};

    if (itemId) {
      if (ObjectId.isValid(itemId)) {
        query.itemId = new ObjectId(itemId);
      } else {
        query.itemId = itemId;
      }
    }

    if (search) {
      query.itemName = { $regex: search, $options: 'i' };
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (referenceType && referenceType !== 'all') {
      query['reference.type'] = referenceType;
    }

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    const total = await MONGODB.collection(STOCK_ADJUSTMENT_COLLECTION).countDocuments(query);

    const adjustments = await MONGODB
      .collection(STOCK_ADJUSTMENT_COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const formattedAdjustments = adjustments.map(adj => ({
      ...adj,
      _id: adj._id.toString(),
      itemId: adj.itemId.toString(),
      createdAt: adj.createdAt.toISOString(),
      displayQuantity: `${adj.quantity} ${adj.unit}`,
      displayPreviousStock: `${adj.previousStock} ${adj.unit}`,
      displayNewStock: `${adj.newStock} ${adj.unit}`,
      displayChange: `${adj.newStock - adj.previousStock > 0 ? '+' : ''}${adj.newStock - adj.previousStock} ${adj.unit}`,
      displayTime: adj.createdAt.toLocaleString()
    }));

    return NextResponse.json({
      adjustments: formattedAdjustments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}