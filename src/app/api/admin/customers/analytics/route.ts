import { NextResponse } from "next/server";
import MONGODB from "@/config/db";

/**
 * GET /api/admin/customers/analytics
 *
 * Returns per-customer analytics for all Google-authenticated customers
 * who have at least one order linked to their account (via customerId).
 *
 * Each customer entry includes:
 *  - latestOrders     : last 5 orders (sorted newest first)
 *  - frequentOrders   : top 5 most-ordered items (by total quantity across all orders)
 *  - ratedOrders      : orders the customer rated, with star + comment
 *  - totalSpent       : sum of all their order totals
 *  - orderingFrequency: computed label (daily / weekly / bi-weekly / monthly / rare)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("id");

    const usersCol = MONGODB.collection("user");
    const ordersCol = MONGODB.collection("orders");
    const ratingsCol = MONGODB.collection("orderRatings");

    // ── CASE A: Fetch Detailed Analytics for ONE Customer ──────────────────
    if (targetId) {
      const user = await usersCol.findOne({
        $or: [{ _id: targetId }, { id: targetId }, { _id: ( (id) => { try { return new (require('mongodb').ObjectId)(id) } catch { return id } })(targetId) }],
        isAnonymous: { $ne: true }
      });

      if (!user) {
        return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
      }

      const userId = user._id.toString();
      const stringId = user.id ? String(user.id) : null;

      // Fetch all orders for this customer
      const orders = await ordersCol
        .find({
          customerId: { $in: [userId, stringId].filter(Boolean) },
          queueStatus: { $nin: ["cancelled"] }
        })
        .sort({ createdAt: -1 })
        .toArray();

      // Fetch ratings for this customer
      const userRatings = await ratingsCol
        .find({ userId: { $in: [userId, stringId].filter(Boolean) } })
        .sort({ createdAt: -1 })
        .toArray();

      // Process latest orders
      const latestOrders = orders.slice(0, 5).map((o) => ({
        orderId: o.orderId || o._id?.toString(),
        orderNumber: o.orderNumber || "—",
        total: o.total || 0,
        itemCount: Array.isArray(o.items) ? o.items.reduce((s: number, i: any) => s + (i.quantity || 1), 0) : 0,
        summary: Array.isArray(o.items) ? o.items.map((i: any) => i.name).join(", ") : "—",
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
        queueStatus: o.queueStatus,
        orderType: o.orderType,
        rating: userRatings.find(r => String(r.orderId) === String(o.orderId || o._id?.toString()))?.rating || null
      }));

      // Frequent orders
      const itemFrequency = new Map<string, any>();
      for (const o of orders) {
        if (!Array.isArray(o.items)) continue;
        const orderDate = o.createdAt ? new Date(o.createdAt).toISOString() : "";
        for (const item of o.items) {
          const key = String(item._id || item.name);
          if (!itemFrequency.has(key)) {
            itemFrequency.set(key, { name: item.name, category: item.category, price: item.price, orderCount: 0, lastOrdered: orderDate });
          }
          const entry = itemFrequency.get(key);
          entry.orderCount += item.quantity || 1;
          if (orderDate > entry.lastOrdered) entry.lastOrdered = orderDate;
        }
      }
      const frequentOrders = [...itemFrequency.values()].sort((a, b) => b.orderCount - a.orderCount).slice(0, 5);



      return NextResponse.json({
        success: true,
        data: {
          customerId: userId,
          name: user.name || "Unknown",
          email: user.email || "",
          image: user.image || null,
          totalSpent: orders.reduce((s, o) => s + (o.total || 0), 0),
          orderCount: orders.length,
          latestOrders,
          frequentOrders,
          orderingFrequency: computeFrequency(orders.length, orders)
        }
      });
    }

    // ── CASE B: Fetch Summary List ─────────────────────────────────────────
    const customersRaw = await usersCol
      .find(
        { $or: [{ role: "customer" }, { role: { $exists: false } }], isAnonymous: { $ne: true } },
        { projection: { _id: 1, id: 1, name: 1, email: 1, image: 1, createdAt: 1 } }
      )
      .toArray();

    // To get order counts and total spent efficiently, we use an aggregation on orders
    const orderSummary = await ordersCol.aggregate([
      { $match: { customerId: { $ne: null }, queueStatus: { $ne: "cancelled" } } },
      { $group: { _id: "$customerId", totalSpent: { $sum: "$total" }, orderCount: { $sum: 1 } } }
    ]).toArray();

    const orderMetaMap = new Map();
    orderSummary.forEach(s => orderMetaMap.set(String(s._id), s));

    const result = customersRaw.map(u => {
      const stats = orderMetaMap.get(u._id.toString()) || orderMetaMap.get(String(u.id)) || { totalSpent: 0, orderCount: 0 };
      return {
        customerId: u._id.toString(),
        name: u.name,
        email: u.email,
        image: u.image,
        totalSpent: Math.round(stats.totalSpent * 100) / 100,
        orderCount: stats.orderCount,
        favoriteCategory: "—" // We'll compute this only on detail fetch to keep it fast
      };
    }).filter(c => c.orderCount > 0);

    result.sort((a, b) => b.totalSpent - a.totalSpent);

    const totalRevenue = result.reduce((s, c) => s + c.totalSpent, 0);

    return NextResponse.json({
      success: true,
      data: {
        customers: result,
        stats: {
          totalCustomers: result.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgOrdersPerCustomer: result.length > 0 ? Math.round((result.reduce((s, c) => s + c.orderCount, 0) / result.length) * 10) / 10 : 0
        }
      }
    });

  } catch (error) {
    console.error("Customer analytics error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch customer analytics" }, { status: 500 });
  }
}

// ── Helper: compute an ordering-frequency label ──────────────────────────────
function computeFrequency(
  count: number,
  orders: any[],
): "daily" | "weekly" | "bi-weekly" | "monthly" | "rare" {
  if (count < 2) return "rare";

  const dates = orders
    .map((o) => (o.createdAt ? new Date(o.createdAt).getTime() : 0))
    .filter(Boolean)
    .sort((a, b) => a - b);

  const spanDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
  if (spanDays === 0) return "daily";

  const avgDaysBetweenOrders = spanDays / (count - 1);

  if (avgDaysBetweenOrders <= 2)  return "daily";
  if (avgDaysBetweenOrders <= 9)  return "weekly";
  if (avgDaysBetweenOrders <= 18) return "bi-weekly";
  if (avgDaysBetweenOrders <= 35) return "monthly";
  return "rare";
}
