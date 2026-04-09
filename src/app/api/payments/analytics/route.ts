import { NextResponse } from "next/server";
import MONGODB from "@/config/db";
import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { success: allowed, response: limitResponse } = rateLimit(request as unknown as Parameters<typeof rateLimit>[0], LIMITS.analytics, session.user.id);
    if (!allowed) return limitResponse!;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week";
    const staffId = searchParams.get("staffId");

    // ── Date range ────────────────────────────────────────────────────────────
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let periodStart: Date;
    switch (period) {
      case "today":
        periodStart = todayStart;
        break;
      case "week":
        periodStart = new Date(todayStart.getTime() - 7 * 86_400_000);
        break;
      case "month":
        periodStart = new Date(todayStart.getTime() - 30 * 86_400_000);
        break;
      case "year":
        periodStart = new Date(todayStart.getFullYear() - 1, todayStart.getMonth(), todayStart.getDate());
        break;
      case "all":
        periodStart = new Date(0);
        break;
      default:
        periodStart = new Date(todayStart.getTime() - 7 * 86_400_000);
    }

    const paymentsCol = MONGODB.collection("payments");
    const ordersCol = MONGODB.collection("orders");

    // ── POS Payments aggregation ─────────────────────────────────────────────
    const posMatchFilter: Record<string, any> = {
      createdAt: { $gte: periodStart },
      status: "completed",
    };
    if (staffId) posMatchFilter.cashierId = staffId;

    // ── Portal Orders aggregation ─────────────────────────────────────────────
    const portalMatchFilter: Record<string, any> = {
      paymentStatus: "paid",
      $or: [
        { paidAt: { $gte: periodStart } },
        { createdAt: { $gte: periodStart } },
      ],
    };

    // Run both pipelines in parallel
    const [posResult, portalResult] = await Promise.all([
      paymentsCol.aggregate([
        { $match: posMatchFilter },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$total" },
                  totalTransactions: { $sum: 1 },
                },
              },
            ],
            daily: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$createdAt",
                      timezone: "Asia/Manila",
                    },
                  },
                  revenue: { $sum: "$total" },
                  transactions: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
            topProducts: [
              { $unwind: "$items" },
              {
                $group: {
                  _id: "$items.name",
                  category: { $first: "$items.category" },
                  quantity: { $sum: { $ifNull: ["$items.quantity", 1] } },
                  revenue: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ["$items.price", 0] },
                        { $ifNull: ["$items.quantity", 1] },
                      ],
                    },
                  },
                },
              },
              { $sort: { revenue: -1 } },
              { $limit: 10 },
            ],
            paymentMethods: [
              {
                $group: {
                  _id: { $toLower: "$paymentMethod" },
                  total: { $sum: "$total" },
                  count: { $sum: 1 },
                },
              },
            ],
            recentTransactions: [
              { $sort: { createdAt: -1 } },
              { $limit: 10 },
              {
                $project: {
                  _id: { $toString: "$_id" },
                  orderNumber: 1,
                  createdAt: 1,
                  customerName: 1,
                  items: 1,
                  total: 1,
                  paymentMethod: 1,
                  orderType: 1,
                  source: { $literal: "pos" },
                },
              },
            ],
          },
        },
      ]).toArray(),

      ordersCol.aggregate([
        { $match: portalMatchFilter },
        {
          $addFields: {
            effectiveDate: { $ifNull: ["$paidAt", "$createdAt"] },
          },
        },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$total" },
                  totalTransactions: { $sum: 1 },
                },
              },
            ],
            daily: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$effectiveDate",
                      timezone: "Asia/Manila",
                    },
                  },
                  revenue: { $sum: "$total" },
                  transactions: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
            topProducts: [
              { $unwind: "$items" },
              {
                $group: {
                  _id: "$items.name",
                  category: { $first: "$items.category" },
                  quantity: { $sum: { $ifNull: ["$items.quantity", 1] } },
                  revenue: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ["$items.price", 0] },
                        { $ifNull: ["$items.quantity", 1] },
                      ],
                    },
                  },
                },
              },
              { $sort: { revenue: -1 } },
              { $limit: 10 },
            ],
            paymentMethods: [
              {
                $group: {
                  _id: { $toLower: "$paymentMethod" },
                  total: { $sum: "$total" },
                  count: { $sum: 1 },
                },
              },
            ],
            recentTransactions: [
              { $sort: { effectiveDate: -1 } },
              { $limit: 10 },
              {
                $project: {
                  _id: { $toString: "$_id" },
                  orderNumber: 1,
                  createdAt: "$effectiveDate",
                  customerName: 1,
                  items: 1,
                  total: 1,
                  paymentMethod: 1,
                  orderType: 1,
                  source: { $literal: "portal" },
                },
              },
            ],
          },
        },
      ]).toArray(),
    ]);

    const posData = posResult[0];
    const portalData = portalResult[0];

    // ── Merge summaries ───────────────────────────────────────────────────────
    const posSummary = posData?.summary?.[0] || { totalRevenue: 0, totalTransactions: 0 };
    const portalSummary = portalData?.summary?.[0] || { totalRevenue: 0, totalTransactions: 0 };

    const totalRevenue = (posSummary.totalRevenue || 0) + (portalSummary.totalRevenue || 0);
    const totalTransactions = (posSummary.totalTransactions || 0) + (portalSummary.totalTransactions || 0);

    // ── Merge daily ───────────────────────────────────────────────────────────
    const dailyMap = new Map<string, { date: string; revenue: number; transactions: number }>();
    for (const d of [...(posData?.daily || []), ...(portalData?.daily || [])]) {
      const key = d._id;
      if (!dailyMap.has(key)) {
        dailyMap.set(key, { date: key, revenue: 0, transactions: 0 });
      }
      const entry = dailyMap.get(key)!;
      entry.revenue += d.revenue || 0;
      entry.transactions += d.transactions || 0;
    }
    const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    // ── Merge top products ────────────────────────────────────────────────────
    const productMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>();
    for (const p of [...(posData?.topProducts || []), ...(portalData?.topProducts || [])]) {
      const key = p._id;
      if (!productMap.has(key)) {
        productMap.set(key, { name: key, category: p.category || "—", quantity: 0, revenue: 0 });
      }
      const entry = productMap.get(key)!;
      entry.quantity += p.quantity || 0;
      entry.revenue += p.revenue || 0;
    }
    const topProducts = [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({ ...p }));

    // ── Merge payment methods ─────────────────────────────────────────────────
    const methodMap = new Map<string, { _id: string; total: number; count: number }>();
    for (const m of [...(posData?.paymentMethods || []), ...(portalData?.paymentMethods || [])]) {
      const key = (m._id || "unknown").toLowerCase();
      if (!methodMap.has(key)) methodMap.set(key, { _id: key, total: 0, count: 0 });
      const entry = methodMap.get(key)!;
      entry.total += m.total || 0;
      entry.count += m.count || 0;
    }
    const paymentMethods = [...methodMap.values()].sort((a, b) => b.total - a.total);

    // ── Merge recent transactions ─────────────────────────────────────────────
    const recentTransactions = [
      ...(posData?.recentTransactions || []),
      ...(portalData?.recentTransactions || []),
    ]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: {
          from: periodStart.toISOString(),
          to: now.toISOString(),
        },
        summary: {
          totalRevenue,
          totalTransactions,
          avgOrderValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        },
        daily,
        topProducts,
        paymentMethods,
        recentTransactions,
        totalCount: totalTransactions,
      },
    });
  } catch (error) {
    console.error("Sales Analytics API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sales analytics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
