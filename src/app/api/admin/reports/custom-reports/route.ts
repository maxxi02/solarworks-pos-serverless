import { NextResponse } from "next/server";
import MONGODB from "@/config/db";
import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const req = { headers: { get: () => null } } as unknown as Parameters<typeof rateLimit>[0];
    const { success: allowed, response: limitResponse } = rateLimit(req, LIMITS.reports, session.user.id);
    if (!allowed) return limitResponse!;

    const ratingsCol = MONGODB.collection("orderRatings");
    const usersCol = MONGODB.collection("user");
    const ordersCol = MONGODB.collection("orders");

    // Fetch users
    const usersRaw = await usersCol.find(
      { $or: [{ role: "customer" }, { role: { $exists: false } }], isAnonymous: { $ne: true } },
      { projection: { _id: 1, id: 1, name: 1, email: 1 } }
    ).toArray();

    // Fetch order stats (visits & last visit)
    const orderSummary = await ordersCol.aggregate([
      { $match: { customerId: { $ne: null }, queueStatus: { $ne: "cancelled" } } },
      { $group: { _id: "$customerId", visits: { $sum: 1 }, lastVisit: { $max: "$createdAt" } } }
    ]).toArray();

    const orderMetaMap = new Map();
    orderSummary.forEach(s => orderMetaMap.set(String(s._id), s));

    // Map users to customers with visits
    let customers = usersRaw.map(u => {
      const stats = orderMetaMap.get(u._id.toString()) || orderMetaMap.get(String(u.id)) || { visits: 0, lastVisit: null };
      return {
        id: u._id.toString(),
        name: u.name || "Unknown",
        email: u.email || "",
        visits: stats.visits,
        lastVisit: stats.lastVisit ? new Date(stats.lastVisit).toISOString().split('T')[0] : null
      };
    });

    // Fetch feedbacks
    const ratingsRaw = await ratingsCol.find({}).sort({ createdAt: -1 }).toArray();
    
    const feedbacks = ratingsRaw.map(r => ({
      id: r._id.toString(),
      customerId: String(r.userId),
      rating: r.rating || 0,
      comment: r.comment || "",
      date: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : "—",
      helpful: 0
    }));

    // Optionally filter customers to only those who have provided feedback
    const usersWithFeedback = new Set(feedbacks.map(f => f.customerId));
    customers = customers.filter(c => usersWithFeedback.has(c.id));

    return NextResponse.json({ success: true, data: { customers, feedbacks } });
  } catch (error) {
    console.error("Custom reports error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch custom reports data" }, { status: 500 });
  }
}
