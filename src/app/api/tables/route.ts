// src/app/api/tables/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";

// GET all tables
export async function GET() {
  try {
    const tables = await MONGODB.collection("tables")
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    const formatted = tables.map((t) => ({
      _id: t._id.toString(),
      tableId: t.tableId as string,
      label: t.label as string,
      qrCodeUrl: t.qrCodeUrl as string,
      qrType: t.qrType as string,
      status: t.status as string,
      currentSessionId: t.currentSessionId as string | null,
      createdBy: t.createdBy as string,
      createdAt: t.createdAt as Date,
      updatedAt: t.updatedAt as Date,
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("❌ GET Tables Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tables",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST create a new table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, qrType, createdBy } = body;

    if (!label?.trim()) {
      return NextResponse.json(
        { error: "Table label is required" },
        { status: 400 },
      );
    }

    // Count existing tables to auto-generate tableId
    const count = await MONGODB.collection("tables").countDocuments();
    const tableId = `table-${count + 1}`;
    const customerPortalUrl =
      process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "http://localhost:3001";
    const qrCodeUrl = `${customerPortalUrl}/order?table=${tableId}&type=${qrType || "dine-in"}`;

    const newTable = {
      tableId,
      label: label.trim(),
      qrCodeUrl,
      qrType: qrType || "dine-in",
      status: "available",
      currentSessionId: null,
      createdBy: createdBy || "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await MONGODB.collection("tables").insertOne(newTable);

    return NextResponse.json(
      { _id: result.insertedId.toString(), ...newTable },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("❌ POST Table Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create table",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// DELETE a table
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get("tableId");

    if (!tableId) {
      return NextResponse.json(
        { error: "tableId is required" },
        { status: 400 },
      );
    }

    const result = await MONGODB.collection("tables").deleteOne({ tableId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, tableId });
  } catch (error: unknown) {
    console.error("❌ DELETE Table Error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete table",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// PATCH update a table
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, label, status } = body;

    if (!tableId) {
      return NextResponse.json(
        { error: "tableId is required" },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (label) updateData.label = label.trim();
    if (status) updateData.status = status;

    const result = await MONGODB.collection("tables").findOneAndUpdate(
      { tableId },
      { $set: updateData },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      _id: result._id.toString(),
    });
  } catch (error: unknown) {
    console.error("❌ PATCH Table Error:", error);
    return NextResponse.json(
      {
        error: "Failed to update table",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
