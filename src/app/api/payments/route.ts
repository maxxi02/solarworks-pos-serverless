import { NextResponse } from "next/server";
import MONGODB from "@/config/db";

// ── Index bootstrap (once per cold-start) ─────────────────────────────────────
let indexesEnsured = false;
async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const col = MONGODB.collection("payments");
    await Promise.all([
      col.createIndex({ createdAt: -1 }),
      col.createIndex({ status: 1, createdAt: -1 }),
      col.createIndex({ paymentMethod: 1 }),
      col.createIndex({ orderNumber: 1 }),
    ]);
    const ordersCol = MONGODB.collection("orders");
    await Promise.all([
      ordersCol.createIndex({ createdAt: -1 }),
      ordersCol.createIndex({ paymentStatus: 1, createdAt: -1 }),
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

/** Normalize a portal `orders` document into the same shape as a `payments` document */
function normalizePortalOrder(o: any) {
  return {
    _id: o._id,
    orderNumber: o.orderNumber || "—",
    customerName: o.customerName || "Customer",
    items: o.items || [],
    subtotal: o.subtotal || 0,
    discountTotal: o.discountTotal || 0,
    total: o.total || 0,
    paymentMethod: (o.paymentMethod || "gcash").toLowerCase(),
    orderType: o.orderType || "dine-in",
    status: o.paymentStatus === "paid" ? "completed" : o.paymentStatus || "completed",
    source: "portal",  // So UI can optionally badge these
    paymentReference: o.paymentReference || null,
    queueStatus: o.queueStatus,
    createdAt: o.paidAt || o.createdAt,   // Use paidAt as the transaction timestamp
    updatedAt: o.updatedAt,
  };
}

/** Normalize a `payments` document */
function normalizePayment(p: any) {
  return {
    ...p,
    source: "pos",
    status: p.status || "completed",
    paymentMethod: (p.paymentMethod || "cash").toLowerCase(),
  };
}

// ── POST — Save a new POS payment ─────────────────────────────────────────────
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

// ── GET — Fetch all transactions (POS payments + paid portal orders) ───────────
export async function GET(request: Request) {
  try {
    await ensureIndexes();

    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const status = searchParams.get("status");         // e.g. "refunded"
    const paymentMethod = searchParams.get("paymentMethod"); // "cash", "gcash", "all"
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const noStats = searchParams.get("noStats") === "true";

    const paymentsCol = MONGODB.collection("payments");
    const ordersCol = MONGODB.collection("orders");

    // ── Build POS payments filter ──────────────────────────────────────────────
    const posFilter: Record<string, any> = {};
    if (status && status !== "all") posFilter.status = status;
    if (paymentMethod && paymentMethod !== "all") posFilter.paymentMethod = { $regex: new RegExp(`^${paymentMethod}$`, "i") };
    if (search) {
      posFilter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { cashier: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      const df: Record<string, any> = {};
      if (startDate) df.$gte = new Date(startDate);
      if (endDate) df.$lte = new Date(endDate);
      posFilter.$and = posFilter.$and || [];
      posFilter.$and.push({ $or: [{ createdAt: df }, { timestamp: df }] });
    }

    // ── Build Portal orders filter (only paid) ─────────────────────────────────
    const portalFilter: Record<string, any> = { paymentStatus: "paid" };
    // Skip portal orders when filtering by status=refunded (they're not refundable via POS)
    const includePortal = !status || status === "all" || status === "completed";
    if (paymentMethod && paymentMethod !== "all") {
      portalFilter.paymentMethod = { $regex: new RegExp(`^${paymentMethod}$`, "i") };
    }
    if (search) {
      portalFilter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      const df: Record<string, any> = {};
      if (startDate) df.$gte = new Date(startDate);
      if (endDate) df.$lte = new Date(endDate);
      portalFilter.$and = portalFilter.$and || [];
      portalFilter.$and.push({ $or: [{ paidAt: df }, { createdAt: df }] });
    }

    // ── Fetch paginated data in parallel ──────────────────────────────────────
    const [posRaw, portalRaw] = await Promise.all([
      paymentsCol.find(posFilter, {
        projection: {
          orderNumber: 1, customerName: 1, subtotal: 1, discountTotal: 1,
          total: 1, paymentMethod: 1, orderType: 1, createdAt: 1, items: 1,
          status: 1, refundedAt: 1, refundedBy: 1, refundReason: 1, timestamp: 1,
        },
      }).sort({ createdAt: -1 }).limit(skip + limit).toArray(),
      includePortal ? ordersCol.find(portalFilter, {
        projection: {
          orderNumber: 1, customerName: 1, customerId: 1, subtotal: 1,
          total: 1, paymentMethod: 1, orderType: 1, paidAt: 1, createdAt: 1,
          items: 1, paymentStatus: 1, paymentReference: 1, queueStatus: 1, updatedAt: 1,
        },
      }).sort({ createdAt: -1 }).limit(skip + limit).toArray() : Promise.resolve([]),
    ]);

    // ── Normalize & merge ─────────────────────────────────────────────────────
    const normalized = [
      ...posRaw.map(normalizePayment),
      ...portalRaw.map(normalizePortalOrder),
    ];

    // Sort all by createdAt desc
    normalized.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });

    const paginatedPayments = normalized.slice(skip, skip + limit);

    // ── Compute stats & total ─────────────────────────────────────────────────
    let total = 0;
    let stats = {
      totalSales: 0,
      totalTransactions: 0,
      averageTransaction: 0,
      cashSales: 0,
      gcashSales: 0,
      splitSales: 0,
    };

    if (!noStats) {
      const [posStatsRaw, portalStatsRaw] = await Promise.all([
        paymentsCol.find(posFilter, {
          projection: { status: 1, paymentMethod: 1, total: 1 }
        }).toArray(),
        includePortal ? ordersCol.find(portalFilter, {
          projection: { paymentStatus: 1, paymentMethod: 1, total: 1 }
        }).toArray() : Promise.resolve([])
      ]);

      const allStatsData = [
        ...posStatsRaw.map(normalizePayment),
        ...portalStatsRaw.map(normalizePortalOrder)
      ];

      total = allStatsData.length;
      const completedAll = allStatsData.filter(
        (t) => t.status === "completed" || t.status === "paid" || !t.status
      );
      const totalSales = completedAll.reduce((s, t) => s + (t.total || 0), 0);
      const cashSales = completedAll
        .filter((t) => (t.paymentMethod || "").toLowerCase() === "cash")
        .reduce((s, t) => s + (t.total || 0), 0);
      const gcashSales = completedAll
        .filter((t) => (t.paymentMethod || "").toLowerCase() === "gcash")
        .reduce((s, t) => s + (t.total || 0), 0);
      const splitSales = completedAll
        .filter((t) => (t.paymentMethod || "").toLowerCase() === "split")
        .reduce((s, t) => s + (t.total || 0), 0);

      stats = {
        totalSales,
        totalTransactions: completedAll.length,
        averageTransaction: completedAll.length ? totalSales / completedAll.length : 0,
        cashSales,
        gcashSales,
        splitSales,
      };
    } else {
      total = skip + paginatedPayments.length;
    }

    return NextResponse.json({
      success: true,
      data: {
        payments: paginatedPayments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
        stats,
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