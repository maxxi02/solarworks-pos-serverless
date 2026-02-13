import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/config/db-Connect';
import { STOCK_ADJUSTMENT_COLLECTION } from '@/models/StockAdjustments';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  return withDatabase(async (db) => {
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

      // Filter by item ID
      if (itemId) {
        if (ObjectId.isValid(itemId)) {
          query.itemId = new ObjectId(itemId);
        } else {
          query.itemId = itemId;
        }
      }

      // Search by item name
      if (search) {
        query.itemName = { $regex: search, $options: 'i' };
      }

      // Filter by adjustment type
      if (type && type !== 'all') {
        query.type = type;
      }

      // Filter by reference type
      if (referenceType && referenceType !== 'all') {
        query['reference.type'] = referenceType;
      }

      // Filter by date range
      if (from || to) {
        query.createdAt = {};
        if (from) {
          query.createdAt.$gte = new Date(from);
        }
        if (to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = toDate;
        }
      }

      // Get total count
      const total = await db
        .collection(STOCK_ADJUSTMENT_COLLECTION)
        .countDocuments(query);

      // Get paginated results
      const adjustments = await db
        .collection(STOCK_ADJUSTMENT_COLLECTION)
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Format for response
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

      // Calculate statistics
      const statsQuery = from || to ? query : {};
      const stats = await db
        .collection(STOCK_ADJUSTMENT_COLLECTION)
        .aggregate([
          { $match: statsQuery },
          { $group: {
            _id: null,
            totalAdjustments: { $sum: 1 },
            totalRestocks: { $sum: { $cond: [{ $eq: ['$type', 'restock'] }, 1, 0] } },
            totalDeductions: { $sum: { $cond: [{ $in: ['$type', ['deduction', 'usage']] }, 1, 0] } },
            totalCorrections: { $sum: { $cond: [{ $eq: ['$type', 'correction'] }, 1, 0] } },
            totalWaste: { $sum: { $cond: [{ $eq: ['$type', 'waste'] }, 1, 0] } }
          }}
        ]).toArray();

      return NextResponse.json({
        adjustments: formattedAdjustments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: stats[0] || {
          totalAdjustments: 0,
          totalRestocks: 0,
          totalDeductions: 0,
          totalCorrections: 0,
          totalWaste: 0
        }
      });

    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }
  });
}