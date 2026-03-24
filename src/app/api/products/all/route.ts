// src/app/api/products/all/route.ts
// Returns a flat list of all products with their category names.
// Used by the Customer Portal Settings admin page.

import { NextRequest, NextResponse } from "next/server";
import MONGODB from "@/config/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";

    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const skip = (page - 1) * limit;

    const [products, totalCount, categories] = await Promise.all([
      MONGODB.collection("products")
        .find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      MONGODB.collection("products").countDocuments(query),
      MONGODB.collection("categories").find({}).toArray(),
    ]);

    // Build a category lookup for O(1) access
    const categoryMap: Record<string, string> = {};
    for (const cat of categories) {
      categoryMap[cat._id.toString()] = cat.name as string;
    }

    const formatted = products.map((p) => ({
      _id: p._id.toString(),
      name: p.name as string,
      price: p.price as number,
      imageUrl: (p.imageUrl as string) || "",
      categoryId: p.categoryId ? p.categoryId.toString() : "",
      categoryName: p.categoryId
        ? categoryMap[p.categoryId.toString()] || "Uncategorized"
        : "Uncategorized",
      available: p.available !== undefined ? (p.available as boolean) : true,
    }));

    return NextResponse.json({
      data: formatted,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (error) {
    console.error("❌ GET /api/products/all error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

