/**
 * GET /api/payments/summary?period=today|week|month&sessionStart=ISO_DATE
 *
 * Returns aggregated stats for the Cash Management page in a single
 * MongoDB aggregate pipeline — no more fetching 500 documents to the
 * frontend and computing everything in JS.
 *
 * Expected response time: <200ms with createdAt index in place.
 *
 * RBAC:
 *  - Admin → full response (grossSales, netSales, totalDiscounts, totalRefunds, payment breakdown)
 *  - Staff → restricted response (cashSales, totalCollected, transactionCount, hourlySales, topItems only)
 */

import { NextRequest, NextResponse } from "next/server";
import MONGODB from "@/config/db";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    // ── Auth & RBAC ───────────────────────────────────────────────────────────
    const auth = await requireAuth(request, ["admin", "staff"]);
    if (!auth.authorized) return auth.response!;
    const userRole = (auth.session!.user as any).role as string;
    const isAdmin = userRole === "admin";

    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period") || "today";
    const sessionStartParam = searchParams.get("sessionStart");

    // ── Date range ────────────────────────────────────────────────────────────
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    let periodStart: Date;
    if (period === "week") {
      periodStart = new Date(todayStart.getTime() - 7 * 86_400_000);
    } else if (period === "month") {
      periodStart = new Date(todayStart.getTime() - 30 * 86_400_000);
    } else {
      periodStart = todayStart;
    }

    // Never go before the session opened
    const sessionStart = sessionStartParam ? new Date(sessionStartParam) : null;
    const effectiveStart =
      sessionStart && sessionStart > periodStart ? sessionStart : periodStart;

    const collection = MONGODB.collection("payments");

    // ── Single aggregate pipeline ─────────────────────────────────────────────
    const [result] = await collection
      .aggregate([
        {
          $match: {
            createdAt: { $gte: effectiveStart },
          },
        },
        {
          $facet: {
            // ── Overall totals ──
            totals: [
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                  totalAmount: { $sum: "$total" },
                  subtotalAmount: {
                    $sum: { $ifNull: ["$subtotal", "$total"] },
                  },
                  discountAmount: { $sum: { $ifNull: ["$discountTotal", 0] } },
                },
              },
            ],
            // ── Payment method breakdown (completed only) ──
            byMethod: [
              { $match: { status: "completed" } },
              {
                $group: {
                  _id: "$paymentMethod",
                  amount: { $sum: "$total" },
                  count: { $sum: 1 },
                },
              },
            ],
            // ── Split payment breakdown ──
            splitBreakdown: [
              { $match: { status: "completed", paymentMethod: "split" } },
              {
                $group: {
                  _id: null,
                  cash: { $sum: { $ifNull: ["$splitPayment.cash", 0] } },
                  gcash: { $sum: { $ifNull: ["$splitPayment.gcash", 0] } },
                },
              },
            ],
            // ── Hourly sales (completed, today only) ──
            hourly: [
              {
                $match: {
                  status: "completed",
                  createdAt: { $gte: todayStart },
                },
              },
              {
                $group: {
                  _id: {
                    $hour: { date: "$createdAt", timezone: "Asia/Manila" },
                  },
                  sales: { $sum: "$total" },
                },
              },
              { $sort: { _id: 1 } },
            ],
            // ── Top items (completed) ──
            topItems: [
              { $match: { status: "completed" } },
              { $unwind: "$items" },
              {
                $group: {
                  _id: "$items.name",
                  qty: { $sum: { $ifNull: ["$items.quantity", 1] } },
                  amount: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ["$items.price", 0] },
                        { $ifNull: ["$items.quantity", 1] },
                      ],
                    },
                  },
                },
              },
              { $sort: { amount: -1 } },
              { $limit: 5 },
            ],
          },
        },
      ])
      .toArray();

    // ── Shape the response ────────────────────────────────────────────────────
    const totalsMap: Record<
      string,
      {
        count: number;
        totalAmount: number;
        subtotalAmount: number;
        discountAmount: number;
      }
    > = {};
    for (const row of result.totals ?? []) {
      totalsMap[row._id] = row;
    }

    const completed = totalsMap["completed"] ?? {
      count: 0,
      totalAmount: 0,
      subtotalAmount: 0,
      discountAmount: 0,
    };
    const refunded = totalsMap["refunded"] ?? {
      count: 0,
      totalAmount: 0,
      subtotalAmount: 0,
      discountAmount: 0,
    };

    const methodMap: Record<string, { amount: number; count: number }> = {};
    for (const row of result.byMethod ?? []) {
      methodMap[row._id] = row;
    }

    const splitData = result.splitBreakdown?.[0] ?? { cash: 0, gcash: 0 };

    // Fold split amounts directly into cash and gcash variables for total collected purposes
    const cashSalesDirect = methodMap["cash"]?.amount ?? 0;
    const gcashSalesDirect = methodMap["gcash"]?.amount ?? 0;
    const cashSales = cashSalesDirect + splitData.cash;
    const gcashSales = gcashSalesDirect + splitData.gcash;
    const splitSales = methodMap["split"]?.amount ?? 0;

    const hourlySales = (result.hourly ?? []).map(
      (h: { _id: number; sales: number }) => ({
        hour: `${h._id}:00`,
        sales: h.sales,
      }),
    );

    const topItems = (result.topItems ?? []).map(
      (i: { _id: string; qty: number; amount: number }) => ({
        name: i._id,
        qty: i.qty,
        amount: i.amount,
      }),
    );

    // ── Role-based field filtering ─────────────────────────────────────────────
    // Staff can only see operational cash-drawer data — not business financial metrics.
    if (!isAdmin) {
      return NextResponse.json({
        success: true,
        data: {
          cashSales,
          totalCollected: cashSales + gcashSales,
          transactionCount: completed.count + refunded.count,
          hourlySales,
          topItems,
        },
      });
    }

    // Admin gets the full response
    return NextResponse.json({
      success: true,
      data: {
        grossSales: completed.subtotalAmount + refunded.subtotalAmount,
        netSales: completed.totalAmount,
        totalDiscounts: completed.discountAmount + refunded.discountAmount,
        totalRefunds: refunded.totalAmount,
        cashSales,
        cashSalesDirect,
        gcashSales,
        gcashSalesDirect,
        splitSales,
        totalCollected: cashSales + gcashSales,
        transactionCount: completed.count + refunded.count,
        hourlySales,
        topItems,
      },
    });
  } catch (error) {
    console.error("Payments summary error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch summary" },
      { status: 500 },
    );
  }
}
