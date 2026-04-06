import { NextRequest, NextResponse } from "next/server";
import { CLIENT, MONGODB } from "@/config/db";
import { requireAuth } from "@/lib/api-auth";
import { PaginationSchema, CreatePaymentSchema } from "@/lib/validators";

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
      col.createIndex({ shopId: 1, createdAt: -1 }), // Added in Fix #2
    ]);
    const ordersCol = MONGODB.collection("orders");
    await Promise.all([
      ordersCol.createIndex({ createdAt: -1 }),
      ordersCol.createIndex({ paymentStatus: 1, createdAt: -1 }),
      ordersCol.createIndex({ orderId: 1 }),
    ]);
    indexesEnsured = true;
  } catch {
    // Non-fatal — indexes may already exist
  }
}

const notifySalesUpdate = async () => {
  try {
    const socketUrl =
      process.env.SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) return;
    await fetch(`${socketUrl}/internal/sales-updated`, {
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
    const socketUrl =
      process.env.SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) return;
    await fetch(`${socketUrl}/internal/cash-updated`, {
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
    orderId: o.orderId,
    orderNumber: o.orderNumber || "—",
    customerName: o.customerName || "Customer",
    items: o.items || [],
    subtotal: o.subtotal || 0,
    discountTotal: o.discountTotal || 0,
    total: o.total || 0,
    paymentMethod: (o.paymentMethod || "gcash").toLowerCase(),
    orderType: o.orderType || "dine-in",
    status:
      o.paymentStatus === "paid" ? "completed" : o.paymentStatus || "completed",
    source: "portal", // So UI can optionally badge these
    paymentReference: o.paymentReference || null,
    queueStatus: o.queueStatus,
    createdAt: o.paidAt || o.createdAt, // Use paidAt as the transaction timestamp
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
export async function POST(request: NextRequest) {
  const session = CLIENT.startSession();
  let responseBody: any = { success: false, error: "Failed to save payment" };
  let responseStatus = 500;

  try {
    const authRecord = await requireAuth(request, ["admin", "staff"]);
    if (!authRecord.authorized) return authRecord.response!;

    const body = await request.json();
    console.log("POST /api/payments - Body:", JSON.stringify(body));

    const parsed = CreatePaymentSchema.safeParse(body);

    if (!parsed.success) {
      console.warn(
        "POST /api/payments - Validation failed:",
        JSON.stringify(parsed.error.format()),
      );
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment data",
          details: parsed.error.format(),
        },
        { status: 400 },
      );
    }

    const { orderId, orderNumber, total, items } = parsed.data;

    await session.withTransaction(async () => {
      const paymentsCollection = MONGODB.collection("payments");
      const ordersCollection = MONGODB.collection("orders");
      await ensureIndexes();

      const paymentData = {
        ...parsed.data,
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 1. Insert payment record
      const result = await paymentsCollection.insertOne(paymentData, {
        session,
      });

      // 2. Handle order record link/creation
      if (orderId) {
        const existingOrder = await ordersCollection.findOne(
          { orderId },
          { session },
        );

        if (existingOrder) {
          // Update existing portal/kiosk order to paid — preserve its queue flow
          // Only update queueStatus if it hasn't progressed past pending_payment
          const queueUpdate: Record<string, unknown> = {
            paymentStatus: "paid",
            paidAt: new Date(),
            updatedAt: new Date(),
          };
          if (existingOrder.queueStatus === "pending_payment") {
            queueUpdate.queueStatus = "queueing";
            queueUpdate.queueingAt = new Date();
          }
          await ordersCollection.updateOne(
            { orderId },
            { $set: queueUpdate },
            { session },
          );
          console.log(`Order ${orderId} updated to paid.`);
        } else {
          // Create a new order record for POS direct walk-in checkout.
          // Mark source:"pos" and queueStatus:"done" so it NEVER appears
          // on the customer queue board (which is only for portal/kiosk orders).
          const newOrder = {
            orderId,
            orderNumber: orderNumber || "POS-WALKIN",
            customerName: parsed.data.customerName || "Walk-in Customer",
            items: items.map((item) => ({
              ...item,
              _id: item.productId,
              ingredients: [],
            })),
            subtotal: parsed.data.subtotal || total,
            total,
            paymentMethod: parsed.data.paymentMethod,
            paymentStatus: "paid",
            queueStatus: "done",   // POS walk-ins bypass the queue entirely
            source: "pos",         // Marks this as a cashier-processed order
            orderType: parsed.data.orderType || "takeaway",
            tableNumber: parsed.data.tableNumber,
            orderNote: parsed.data.orderNote,
            seniorPwdCount: parsed.data.seniorPwdCount,
            seniorPwdIds: parsed.data.seniorPwdIds,
            splitPayment: parsed.data.splitPayment,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            paidAt: new Date(),
          };

          await ordersCollection.insertOne(newOrder, { session });
          console.log(`Order ${orderId} created (POS walk-in, source:pos, queueStatus:done).`);
        }
      }

      // 3. (Future) Add inventory deduction logic here using the session
      // For now, atomic order/payment linking is established.

      console.log("Payment saved with ID:", result.insertedId);
      responseBody = {
        success: true,
        data: { _id: result.insertedId, ...paymentData },
      };
      responseStatus = 200;
    });

    // After success, notify services (outside transaction as they are HTTP)
    notifySalesUpdate();
    notifyCashUpdate();

    return NextResponse.json(responseBody, { status: responseStatus });
  } catch (error: any) {
    console.error("POST /api/payments error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save payment";

    // Provide more context for Mongo connection errors
    if (
      errorMessage.includes("Server selection timed out") ||
      errorMessage.includes("Topology is closed")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection timeout. Please try again.",
          details: errorMessage,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  } finally {
    await session.endSession();
  }
}

// ── GET — Fetch all transactions (POS payments + paid portal orders) ───────────
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin", "staff"]);
    if (!auth.authorized) return auth.response!;

    await ensureIndexes();

    const { searchParams } = new URL(request.url);
    const parsed = PaginationSchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query parameters" },
        { status: 400 },
      );
    }

    const { page, limit, search } = parsed.data;
    const skip = (page - 1) * limit;

    const status = searchParams.get("status"); // e.g. "refunded"
    const paymentMethod = searchParams.get("paymentMethod"); // "cash", "gcash", "all"
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const noStats = searchParams.get("noStats") === "true";

    const paymentsCol = MONGODB.collection("payments");
    const ordersCol = MONGODB.collection("orders");

    // ── Build POS payments filter ──────────────────────────────────────────────
    const posFilter: Record<string, any> = {};
    if (status && status !== "all") {
      if (status === "completed") {
        posFilter.status = { $in: ["completed", "Completed", null] };
      } else {
        posFilter.status = status;
      }
    }
    if (paymentMethod && paymentMethod !== "all")
      posFilter.paymentMethod = {
        $regex: new RegExp(`^${paymentMethod}$`, "i"),
      };
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
      portalFilter.paymentMethod = {
        $regex: new RegExp(`^${paymentMethod}$`, "i"),
      };
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
      paymentsCol
        .find(posFilter, {
          projection: {
            orderNumber: 1,
            orderId: 1,
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
            timestamp: 1,
            splitPayment: 1,
          },
        })
        .sort({ createdAt: -1 })
        .limit(skip + limit)
        .toArray(),
      includePortal
        ? ordersCol
            .find(portalFilter, {
              projection: {
                orderNumber: 1,
                orderId: 1,
                customerName: 1,
                customerId: 1,
                subtotal: 1,
                total: 1,
                paymentMethod: 1,
                orderType: 1,
                paidAt: 1,
                createdAt: 1,
                items: 1,
                paymentStatus: 1,
                paymentReference: 1,
                queueStatus: 1,
                updatedAt: 1,
                splitPayment: 1,
              },
            })
            .sort({ createdAt: -1 })
            .limit(skip + limit)
            .toArray()
        : Promise.resolve([]),
    ]);

    // ── Normalize & merge ─────────────────────────────────────────────────────
    const normalizedPos = posRaw.map(normalizePayment);
    const normalizedPortal = portalRaw.map(normalizePortalOrder);

    // Deduplicate by orderId or orderNumber (payments takes precedence, so we add portal first)
    const combinedMap = new Map();
    for (const p of normalizedPortal) {
      if (p.orderId) combinedMap.set(p.orderId, p);
      else combinedMap.set(p.orderNumber, p);
    }
    for (const p of normalizedPos) {
      if (p.orderId) combinedMap.set(p.orderId, p);
      else combinedMap.set(p.orderNumber, p);
    }
    const normalized = Array.from(combinedMap.values());

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
        paymentsCol
          .find(posFilter, {
            projection: {
              status: 1,
              paymentMethod: 1,
              total: 1,
              orderId: 1,
              orderNumber: 1,
            },
          })
          .toArray(),
        includePortal
          ? ordersCol
              .find(portalFilter, {
                projection: {
                  paymentStatus: 1,
                  paymentMethod: 1,
                  total: 1,
                  orderId: 1,
                  orderNumber: 1,
                },
              })
              .toArray()
          : Promise.resolve([]),
      ]);

      const normalizedPosStats = posStatsRaw.map(normalizePayment);
      const normalizedPortalStats = portalStatsRaw.map(normalizePortalOrder);

      const statsMap = new Map();
      for (const p of normalizedPortalStats) {
        if (p.orderId) statsMap.set(p.orderId, p);
        else statsMap.set(p.orderNumber, p);
      }
      for (const p of normalizedPosStats) {
        if (p.orderId) statsMap.set(p.orderId, p);
        else statsMap.set(p.orderNumber, p);
      }
      const allStatsData = Array.from(statsMap.values());

      total = allStatsData.length;
      const completedAll = allStatsData.filter(
        (t) => t.status === "completed" || t.status === "paid" || !t.status,
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
        averageTransaction: completedAll.length
          ? totalSales / completedAll.length
          : 0,
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
