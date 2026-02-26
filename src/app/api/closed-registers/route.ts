// app/api/closed-registers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import MONGODB from '@/config/db';

const col = () => MONGODB.collection('sessions');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    
    const now = new Date();
    let startDate = new Date();
    const endDate = new Date();
    
    switch (period) {
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'today':
      default:
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }
    
    // Get all closed sessions within the date range
    const closedRegisters = await col()
      .find({
        status: 'closed',
        closedAt: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .sort({ closedAt: -1 })
      .toArray();
    
    return NextResponse.json({
      success: true,
      data: closedRegisters,
      period,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error('GET /api/closed-registers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch closed registers' },
      { status: 500 }
    );
  }
}