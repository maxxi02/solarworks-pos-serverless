// app/api/payments/summary/route.ts
import { NextResponse } from 'next/server';
import MONGODB from '@/config/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week'; // today, week, month, year, all
    
    // Date filter
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
      case 'today':
        startDate = new Date(now.setHours(0,0,0,0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }
    
    const collection = MONGODB.collection('payments');
    const matchStage = { $match: { createdAt: { $gte: startDate } } };
    
    // RUN ALL QUERIES IN PARALLEL - isang bagsakan!
    const [
      summaryResult,
      dailyResult,
      productsResult,
      methodsResult,
      recentResult,
      totalCount
    ] = await Promise.all([
      
      // 1. Overall summary
      collection.aggregate([
        matchStage,
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalTransactions: { $sum: 1 },
            avgOrderValue: { $avg: '$total' }
          }
        }
      ]).toArray(),
      
      // 2. Daily sales breakdown
      collection.aggregate([
        matchStage,
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            revenue: { $sum: '$total' },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id.date',
            revenue: 1,
            transactions: 1,
            avgOrder: { $round: [{ $divide: ['$revenue', '$transactions'] }, 2] }
          }
        }
      ]).toArray(),
      
      // 3. Top products
      collection.aggregate([
        matchStage,
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              name: '$items.name',
              category: '$items.category'
            },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.revenue' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            name: '$_id.name',
            category: '$_id.category',
            quantity: 1,
            revenue: 1
          }
        }
      ]).toArray(),
      
      // 4. Payment methods breakdown
      collection.aggregate([
        matchStage,
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$total' },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            method: '$_id',
            total: 1,
            count: 1,
            _id: 0
          }
        }
      ]).toArray(),
      
      // 5. Recent transactions
      collection.find(matchStage.$match)
        .sort({ createdAt: -1 })
        .limit(10)
        .project({
          orderNumber: 1,
          customerName: 1,
          total: 1,
          paymentMethod: 1,
          orderType: 1,
          createdAt: 1,
          items: { $size: '$items' }
        })
        .toArray(),
      
      // 6. Total count for this period
      collection.countDocuments(matchStage.$match)
    ]);
    
    // Format the response
    const summary = summaryResult[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      avgOrderValue: 0
    };
    
    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: {
          from: startDate,
          to: new Date()
        },
        summary: {
          ...summary,
          totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
          avgOrderValue: Math.round(summary.avgOrderValue * 100) / 100
        },
        daily: dailyResult,
        topProducts: productsResult,
        paymentMethods: methodsResult,
        recentTransactions: recentResult,
        transactionsCount: totalCount
      }
    });
    
  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate summary'
    }, { status: 500 });
  }
}