// src/app/api/products/all/route.ts
// Returns a flat list of all products with their category names.
// Used by the Customer Portal Settings admin page.

import { NextRequest, NextResponse } from "next/server";
import MONGODB from "@/config/db";
import { requireAuth } from "@/lib/api-auth";
import { ProductQuerySchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["admin", "staff"]);
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(req.url);
    const parsed = ProductQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { page, limit, search, categoryId } = parsed.data;

    const query: any = {};
    const sort: any = { name: 1 };
    let project: any = {};

    if (search) {
      // Fix #6: Use $text search for better performance and relevance
      query.$text = { $search: search };
      // Sort by relevance score
      project = { score: { $meta: "textScore" } };
      sort.score = { $meta: "textScore" };
    }
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const skip = (page - 1) * limit;

    const [products, totalCount, categories] = await Promise.all([
      MONGODB.collection("products")
        .find(query, { projection: project })
        .sort(sort)
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

