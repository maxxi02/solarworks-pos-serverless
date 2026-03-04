// src/app/api/tables/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const table = await MONGODB.collection("tables").findOne({ tableId: id });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const formatted = {
      _id: table._id.toString(),
      tableId: table.tableId as string,
      label: table.label as string,
      qrCodeUrl: table.qrCodeUrl as string,
      qrType: table.qrType as string,
      status: table.status as string,
      currentSessionId: table.currentSessionId as string | null,
      createdBy: table.createdBy as string,
      createdAt: table.createdAt as Date,
      updatedAt: table.updatedAt as Date,
    };

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("❌ GET Single Table Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch table",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
