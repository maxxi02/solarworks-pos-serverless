import { NextResponse } from "next/server";
import MONGODB from "@/config/db";

// ── Ensure indexes exist (runs once per cold start) ──────────────────────────
let indexesEnsured = false;
async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const col = MONGODB.collection("payments");
    await Promise.all([
      col.createIndex({ createdAt: -1 }),           // primary sort
      col.createIndex({ status: 1, createdAt: -1 }), // filtered queries
      col.createIndex({ paymentMethod: 1 }),
      col.createIndex({ orderNumber: 1 }),
    ]);
    indexesEnsured = true;
  } catch {
    // Non-fatal — indexes may already exist
  }
}

const notifySalesUpdate = async () => {
  try {
    await fetch(`${process.env.SOCKET_URL}/internal/sales-updated`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.BETTER_AUTH_SECRET || "",
      },
    });
  } catch (err) {
    console.warn("Could not notify socket server:", err);
  }
};

const notifyCashUpdate = async () => {
  try {
    await fetch(`${process.env.SOCKET_URL}/internal/cash-updated`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.BETTER_AUTH_SECRET || "",
      },
    });
  } catch (err) {
    console.warn("Could not notify socket server (cash):", err);
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.orderNumber || !body.total || !body.paymentMethod) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const collection = MONGODB.collection("payments");
    await ensureIndexes();

    const result = await collection.insertOne({
      ...body,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Payment saved with ID:", result.insertedId);
    notifySalesUpdate();
    notifyCashUpdate();

    return NextResponse.json({
      success: true,
      data: { _id: result.insertedId, ...body },
    });
  } catch (error) {
    console.error("Payment save error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save payment" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    await ensureIndexes();

    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "10");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const status = searchParams.get("status");
    const paymentMethod = searchParams.get("paymentMethod");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // ── Build filter ──────────────────────────────────────────────────────────
    const filter: Record<string, any> = {};

    if (status && status !== "all") filter.status = status;
    if (paymentMethod && paymentMethod !== "all") filter.paymentMethod = paymentMethod;

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { cashier: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, any> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      const dateConditions = [
        { timestamp: dateFilter },
        { createdAt: dateFilter },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: dateConditions }];
        delete filter.$or;
      } else {
        filter.$or = dateConditions;
      }
    }

    // ── Build sort ────────────────────────────────────────────────────────────
    const sortField =
      sortBy === "amount" ? "total" :
      sortBy === "name" ? "customerName" :
      "createdAt";
    const sort: Record<string, 1 | -1> = {
      [sortField]: sortOrder === "asc" ? 1 : -1,
    };

    const collection = MONGODB.collection("payments");

    const projection = {
      orderNumber: 1,
      customerName: 1,
      subtotal: 1,
      discountTotal: 1,
      total: 1,
      paymentMethod: 1,
      orderType: 1,
      createdAt: 1,
      items: 1,
      status: 1,
      refundedAt: 1,
      refundedBy: 1,
      refundReason: 1,
    };

    // ── Run paginated results + count + stats in parallel ─────────────────────
    const statsFilter = { ...filter, status: "completed" };

    const [payments, total, statsResult] = await Promise.all([
      collection.find(filter, { projection }).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
      collection.aggregate([
        { $match: statsFilter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$total" },
            totalTransactions: { $sum: 1 },
            cashSales: { $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, "$total", 0] } },
            gcashSales: { $sum: { $cond: [{ $eq: ["$paymentMethod", "gcash"] }, "$total", 0] } },
            splitSales: { $sum: { $cond: [{ $eq: ["$paymentMethod", "split"] }, "$total", 0] } },
          },
        },
      ]).toArray(),
    ]);

    const summary = statsResult[0] || {
      totalSales: 0, totalTransactions: 0,
      cashSales: 0, gcashSales: 0, splitSales: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        stats: {
          totalSales: summary.totalSales,
          totalTransactions: summary.totalTransactions,
          averageTransaction: summary.totalTransactions
            ? summary.totalSales / summary.totalTransactions
            : 0,
          cashSales: summary.cashSales,
          gcashSales: summary.gcashSales,
          splitSales: summary.splitSales,
        },
      },
    });
  } catch (error) {
    console.error("Payment fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payments" },
      { status: 500 },
    );
  }
}