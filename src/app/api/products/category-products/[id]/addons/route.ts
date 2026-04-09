// src/app/api/products/category-products/[id]/addons/route.ts
// GET  — fetch addon groups for a product
// PUT  — replace all addon groups for a product

import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";
import { AddonGroup } from "@/types/products";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const product = await MONGODB.collection("products").findOne(
      { _id: new ObjectId(id) },
      { projection: { addonGroups: 1 } },
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ addonGroups: product.addonGroups || [] });
  } catch (err) {
    console.error("GET /addons error:", err);
    return NextResponse.json({ error: "Failed to fetch addon groups" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const body = await request.json();
    const addonGroups: AddonGroup[] = Array.isArray(body.addonGroups) ? body.addonGroups : [];

    // Validate each group minimally
    for (const group of addonGroups) {
      if (!group.name?.trim()) {
        return NextResponse.json(
          { error: "Each addon group must have a name" },
          { status: 400 },
        );
      }
      if (!Array.isArray(group.items) || group.items.length === 0) {
        return NextResponse.json(
          { error: `Addon group "${group.name}" must have at least one item` },
          { status: 400 },
        );
      }
      for (const item of group.items) {
        if (!item.name?.trim()) {
          return NextResponse.json(
            { error: `Addon item in group "${group.name}" must have a name` },
            { status: 400 },
          );
        }
        if (typeof item.price !== "number" || item.price < 0) {
          return NextResponse.json(
            { error: `Addon item "${item.name}" must have a valid price (≥ 0)` },
            { status: 400 },
          );
        }
      }
    }

    const result = await MONGODB.collection("products").updateOne(
      { _id: new ObjectId(id) },
      { $set: { addonGroups, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, addonGroups });
  } catch (err) {
    console.error("PUT /addons error:", err);
    return NextResponse.json({ error: "Failed to update addon groups" }, { status: 500 });
  }
}
