import { NextResponse } from 'next/server';
import MONGODB from '@/config/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getAnalyticsData(type: string, paymentsCollection: any, inventoryCollection: any, usersCollection: any, attendanceCollection: any, productsCollection: any) {
  const now = new Date();
  const todayStart = new Date(now.getTime());
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getTime());
  monthStart.setMonth(monthStart.getMonth() - 1);

  switch (type) {
    case 'today-highlights': {
      const [todaySales, yesterdaySales, todayProducts] = await Promise.all([
        paymentsCollection.aggregate([
          { $match: { createdAt: { $gte: todayStart } } },
          { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalTransactions: { $sum: 1 } } }
        ]).toArray(),
        paymentsCollection.aggregate([
          { $match: { createdAt: { $gte: new Date(todayStart.getTime() - 24 * 60 * 60 * 1000), $lt: todayStart } } },
          { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalTransactions: { $sum: 1 } } }
        ]).toArray(),
        paymentsCollection.aggregate([
          { $match: { createdAt: { $gte: todayStart } } },
          { $unwind: '$items' },
          { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.revenue' } } },
          { $sort: { quantity: -1 } },
          { $limit: 10 },
          { $project: { _id: 0, name: '$_id', quantity: 1, revenue: { $round: ['$revenue', 2] } } }
        ]).toArray()
      ]);

      return {
        todayRevenue: todaySales[0]?.totalRevenue || 0,
        todayTransactions: todaySales[0]?.totalTransactions || 0,
        yesterdayRevenue: yesterdaySales[0]?.totalRevenue || 0,
        topProductsToday: todayProducts
      };
    }

    case 'monthly-trends': {
      const [monthSales, monthProducts] = await Promise.all([
        paymentsCollection.aggregate([
          { $match: { createdAt: { $gte: monthStart } } },
          { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalTransactions: { $sum: 1 } } }
        ]).toArray(),
        paymentsCollection.aggregate([
          { $match: { createdAt: { $gte: monthStart } } },
          { $unwind: '$items' },
          { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.revenue' } } },
          { $sort: { quantity: -1 } },
          { $limit: 10 },
          { $project: { _id: 0, name: '$_id', quantity: 1, revenue: { $round: ['$revenue', 2] } } }
        ]).toArray()
      ]);

      return {
        monthRevenue: monthSales[0]?.totalRevenue || 0,
        monthTransactions: monthSales[0]?.totalTransactions || 0,
        topProductsMonth: monthProducts
      };
    }

    case 'all-time-stats': {
      const [allTimeSales, allTimeProducts, totalProducts, totalCustomers, totalStaff] = await Promise.all([
        paymentsCollection.aggregate([
          { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalTransactions: { $sum: 1 } } }
        ]).toArray(),
        paymentsCollection.aggregate([
          { $unwind: '$items' },
          { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.revenue' } } },
          { $sort: { quantity: -1 } },
          { $limit: 10 },
          { $project: { _id: 0, name: '$_id', quantity: 1, revenue: { $round: ['$revenue', 2] } } }
        ]).toArray(),
        productsCollection.countDocuments({}),
        usersCollection.countDocuments({ role: 'customer' }),
        usersCollection.countDocuments({ role: 'staff' })
      ]);

      return {
        totalRevenue: allTimeSales[0]?.totalRevenue || 0,
        totalTransactions: allTimeSales[0]?.totalTransactions || 0,
        topProductsAllTime: allTimeProducts,
        totalProducts,
        totalCustomers,
        totalStaff
      };
    }

    case 'inventory-insights': {
      const [lowStockItems, criticalStockItems, totalProducts, totalValue] = await Promise.all([
        inventoryCollection.aggregate([
          { $match: { $expr: { $lte: ['$currentStock', '$reorderPoint'] }, currentStock: { $gt: 0 } } },
          { $sort: { currentStock: 1 } },
          { $limit: 10 },
          { $project: { _id: 0, name: 1, currentStock: 1, reorderPoint: 1 } }
        ]).toArray(),
        inventoryCollection.aggregate([
          { $match: { currentStock: { $lte: 5 } } },
          { $sort: { currentStock: 1 } },
          { $limit: 10 },
          { $project: { _id: 0, name: 1, currentStock: 1, reorderPoint: 1 } }
        ]).toArray(),
        inventoryCollection.countDocuments({}),
        inventoryCollection.aggregate([
          { $group: { _id: null, totalValue: { $sum: { $multiply: ['$currentStock', '$pricePerUnit'] } } } }
        ]).toArray()
      ]);

      return {
        totalProducts,
        totalInventoryValue: totalValue[0]?.totalValue || 0,
        lowStockItems,
        criticalStockItems,
        itemsNeedingRestock: lowStockItems.length + criticalStockItems.length
      };
    }

    case 'full-summary': {
      const [todaySales, monthSales, allTimeSales, inventoryStats, lowStock, criticalStock] = await Promise.all([
        paymentsCollection.aggregate([
          { $match: { createdAt: { $gte: todayStart } } },
          { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalTransactions: { $sum: 1 } } }
        ]).toArray(),
        paymentsCollection.aggregate([
          { $match: { createdAt: { $gte: monthStart } } },
          { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalTransactions: { $sum: 1 } } }
        ]).toArray(),
        paymentsCollection.aggregate([
          { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalTransactions: { $sum: 1 } } }
        ]).toArray(),
        inventoryCollection.countDocuments({}),
        inventoryCollection.countDocuments({ $expr: { $lte: ['$currentStock', '$reorderPoint'] } }),
        inventoryCollection.countDocuments({ currentStock: { $lte: 5 } })
      ]);

      return {
        todayRevenue: todaySales[0]?.totalRevenue || 0,
        todayTransactions: todaySales[0]?.totalTransactions || 0,
        monthRevenue: monthSales[0]?.totalRevenue || 0,
        monthTransactions: monthSales[0]?.totalTransactions || 0,
        totalRevenue: allTimeSales[0]?.totalRevenue || 0,
        totalTransactions: allTimeSales[0]?.totalTransactions || 0,
        totalProducts: inventoryStats,
        itemsNeedingRestock: lowStock + criticalStock
      };
    }

    default:
      return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';

    const paymentsCollection = MONGODB.collection('payments');
    const productsCollection = MONGODB.collection('products');
    const inventoryCollection = MONGODB.collection('inventory');
    const usersCollection = MONGODB.collection('users');
    const attendanceCollection = MONGODB.collection('attendance');

    const now = new Date();
    const todayStart = new Date(now.getTime());
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getTime());
    monthStart.setMonth(monthStart.getMonth() - 1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let responseData: any = {};

    switch (type) {
      case 'summary':
      case 'today-highlights': {
        const [todaySales, yesterdaySales, todayProducts, recentTransactions] = await Promise.all([
          paymentsCollection.aggregate([
            { $match: { createdAt: { $gte: todayStart } } },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                totalTransactions: { $sum: 1 }
              }
            }
          ]).toArray(),
          paymentsCollection.aggregate([
            { $match: { createdAt: { $gte: new Date(todayStart.getTime() - 24 * 60 * 60 * 1000), $lt: todayStart } } },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                totalTransactions: { $sum: 1 }
              }
            }
          ]).toArray(),
          paymentsCollection.aggregate([
            { $match: { createdAt: { $gte: todayStart } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.name',
                quantity: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.revenue' }
              }
            },
            { $sort: { quantity: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, name: '$_id', quantity: 1, revenue: { $round: ['$revenue', 2] } } }
          ]).toArray(),
          paymentsCollection.aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { _id: 1, orderNumber: 1, total: 1, paymentMethod: 1, createdAt: 1 } }
          ]).toArray()
        ]);

        const todayRevenue = todaySales[0]?.totalRevenue || 0;
        const yesterdayRevenue = yesterdaySales[0]?.totalRevenue || 0;
        const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1) : '0';

        responseData = {
          type: 'today-highlights',
          generatedAt: new Date().toISOString(),
          todayRevenue: Math.round(todayRevenue * 100) / 100,
          todayTransactions: todaySales[0]?.totalTransactions || 0,
          yesterdayRevenue: Math.round(yesterdayRevenue * 100) / 100,
          revenueChange: revenueChange,
          topProductsToday: todayProducts,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recentTransactions: recentTransactions.map((t: any) => ({
            ...t,
            total: Math.round(t.total * 100) / 100,
            createdAt: t.createdAt?.toISOString()
          }))
        };
        break;
      }

      case 'monthly-trends': {
        const [monthSales, lastMonthSales, monthProducts, dailyTrend] = await Promise.all([
          paymentsCollection.aggregate([
            { $match: { createdAt: { $gte: monthStart } } },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                totalTransactions: { $sum: 1 }
              }
            }
          ]).toArray(),
          paymentsCollection.aggregate([
            { 
              $match: { 
                createdAt: { 
                  $gte: new Date(monthStart.getTime() - 30 * 24 * 60 * 60 * 1000), 
                  $lt: monthStart 
                } 
              } 
            },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                totalTransactions: { $sum: 1 }
              }
            }
          ]).toArray(),
          paymentsCollection.aggregate([
            { $match: { createdAt: { $gte: monthStart } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.name',
                quantity: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.revenue' }
              }
            },
            { $sort: { quantity: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, name: '$_id', quantity: 1, revenue: { $round: ['$revenue', 2] } } }
          ]).toArray(),
          paymentsCollection.aggregate([
            { $match: { createdAt: { $gte: monthStart } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                revenue: { $sum: '$total' },
                transactions: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', revenue: { $round: ['$revenue', 2] }, transactions: 1 } }
          ]).toArray()
        ]);

        const monthRevenue = monthSales[0]?.totalRevenue || 0;
        const lastMonthRevenue = lastMonthSales[0]?.totalRevenue || 0;
        const monthChange = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : '0';

        responseData = {
          type: 'monthly-trends',
          generatedAt: new Date().toISOString(),
          monthRevenue: Math.round(monthRevenue * 100) / 100,
          monthTransactions: monthSales[0]?.totalTransactions || 0,
          lastMonthRevenue: Math.round(lastMonthRevenue * 100) / 100,
          monthChange: monthChange,
          topProductsMonth: monthProducts,
          dailyTrend
        };
        break;
      }

      case 'all-time-stats': {
        const [allTimeSales, allTimeProducts, totalProducts, totalCustomers, totalStaff] = await Promise.all([
          paymentsCollection.aggregate([
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                totalTransactions: { $sum: 1 }
              }
            }
          ]).toArray(),
          paymentsCollection.aggregate([
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.name',
                quantity: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.revenue' }
              }
            },
            { $sort: { quantity: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, name: '$_id', quantity: 1, revenue: { $round: ['$revenue', 2] } } }
          ]).toArray(),
          productsCollection.countDocuments({}),
          usersCollection.countDocuments({ role: 'customer' }),
          usersCollection.countDocuments({ role: 'staff' })
        ]);

        responseData = {
          type: 'all-time-stats',
          generatedAt: new Date().toISOString(),
          totalRevenue: Math.round((allTimeSales[0]?.totalRevenue || 0) * 100) / 100,
          totalTransactions: allTimeSales[0]?.totalTransactions || 0,
          topProductsAllTime: allTimeProducts,
          totalProducts,
          totalCustomers,
          totalStaff
        };
        break;
      }

      case 'inventory-insights': {
        const [lowStockItems, criticalStockItems, totalProducts, totalValue] = await Promise.all([
          inventoryCollection.aggregate([
            { $match: { $expr: { $lte: ['$currentStock', '$reorderPoint'] }, currentStock: { $gt: 0 } } },
            { $sort: { currentStock: 1 } },
            { $limit: 10 },
            { $project: { _id: 0, name: 1, currentStock: 1, reorderPoint: 1, pricePerUnit: 1 } }
          ]).toArray(),
          inventoryCollection.aggregate([
            { $match: { currentStock: { $lte: 5 } } },
            { $sort: { currentStock: 1 } },
            { $limit: 10 },
            { $project: { _id: 0, name: 1, currentStock: 1, reorderPoint: 1, pricePerUnit: 1 } }
          ]).toArray(),
          inventoryCollection.countDocuments({}),
          inventoryCollection.aggregate([
            {
              $group: {
                _id: null,
                totalValue: { $sum: { $multiply: ['$currentStock', '$pricePerUnit'] } }
              }
            }
          ]).toArray()
        ]);

        responseData = {
          type: 'inventory-insights',
          generatedAt: new Date().toISOString(),
          totalProducts,
          totalInventoryValue: Math.round((totalValue[0]?.totalValue || 0) * 100) / 100,
          lowStockItems,
          criticalStockItems,
          itemsNeedingRestock: lowStockItems.length + criticalStockItems.length
        };
        break;
      }

      case 'staff-performance': {
        const [staffList, attendanceStats] = await Promise.all([
          usersCollection.find({ role: 'staff' }).project({ name: 1, email: 1 }).limit(20).toArray(),
          attendanceCollection.aggregate([
            { $match: { createdAt: { $gte: monthStart } } },
            {
              $group: {
                _id: '$userId',
                totalHours: { $sum: '$hoursWorked' },
                daysPresent: { $sum: 1 }
              }
            },
            { $sort: { totalHours: -1 } },
            { $limit: 10 }
          ]).toArray()
        ]);

        responseData = {
          type: 'staff-performance',
          generatedAt: new Date().toISOString(),
          staffList: staffList.map(s => s.name || s.email),
          topPerformers: attendanceStats,
          period: 'last-30-days'
        };
        break;
      }

      case 'full-summary': {
        const nowFull = new Date();
        const todayStartFull = new Date(nowFull.setHours(0, 0, 0, 0));
        const monthStartFull = new Date(nowFull.setMonth(nowFull.getMonth() - 1));

        const [todaySales, monthSales, allTimeSales, inventoryStats] = await Promise.all([
          paymentsCollection.aggregate([
            { $match: { createdAt: { $gte: todayStartFull } } },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                totalTransactions: { $sum: 1 }
              }
            }
          ]).toArray(),
          paymentsCollection.aggregate([
            { $match: { createdAt: { $gte: monthStartFull } } },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                totalTransactions: { $sum: 1 }
              }
            }
          ]).toArray(),
          paymentsCollection.aggregate([
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                totalTransactions: { $sum: 1 }
              }
            }
          ]).toArray(),
          Promise.all([
            inventoryCollection.countDocuments({}),
            inventoryCollection.aggregate([
              { $match: { $expr: { $lte: ['$currentStock', '$reorderPoint'] } } },
              { $count: 'count' }
            ]).toArray(),
            inventoryCollection.aggregate([
              { $match: { currentStock: { $lte: 5 } } },
              { $count: 'count' }
            ]).toArray()
          ])
        ]);

        const lowStockCount = inventoryStats[1][0]?.count || 0;
        const criticalStockCount = inventoryStats[2][0]?.count || 0;

        responseData = {
          type: 'full-summary',
          generatedAt: new Date().toISOString(),
          today: {
            todayRevenue: Math.round((todaySales[0]?.totalRevenue || 0) * 100) / 100,
            todayTransactions: todaySales[0]?.totalTransactions || 0
          },
          month: {
            monthRevenue: Math.round((monthSales[0]?.totalRevenue || 0) * 100) / 100,
            monthTransactions: monthSales[0]?.totalTransactions || 0
          },
          allTime: {
            totalRevenue: Math.round((allTimeSales[0]?.totalRevenue || 0) * 100) / 100,
            totalTransactions: allTimeSales[0]?.totalTransactions || 0
          },
          inventory: {
            totalProducts: inventoryStats[0],
            itemsNeedingRestock: lowStockCount + criticalStockCount
          }
        };
        break;
      }

      default:
        responseData = { error: 'Invalid type parameter' };
    }

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error('AI Companion API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
