import { NextResponse } from "next/server";
import MONGODB from "@/config/db";

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
    // Non-critical — don't fail the payment if this errors
    console.warn("Could not notify socket server:", err);
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.orderNumber || !body.total || !body.paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    const collection = MONGODB.collection("payments");

    // Insert the payment record
    const result = await collection.insertOne({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Payment saved with ID:", result.insertedId);

    // Notify socket server about the sales update (fire and forget)
    notifySalesUpdate();

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId,
        ...body,
      },
    });
  } catch (error) {
    console.error("Payment save error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save payment",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const collection = MONGODB.collection("payments");

    const [payments, total] = await Promise.all([
      collection
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(),
    ]);

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
      },
    });
  } catch (error) {
    console.error("Payment fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payments",
      },
      { status: 500 },
    );
  }
}
