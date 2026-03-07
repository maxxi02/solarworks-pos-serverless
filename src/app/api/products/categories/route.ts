// src/app/api/categories/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";
import { WithId, Document } from "mongodb";
import {
  MongoDBProduct,
  MongoDBCategory,
  FormattedProduct,
  CategoryInput,
} from "@/types/products";

function formatProduct(p: WithId<Document>): FormattedProduct {
  return {
    _id: p._id.toString(),
    name: p.name as string,
    price: p.price as number,
    description: (p.description as string) || "",
    ingredients: Array.isArray(p.ingredients)
      ? (p.ingredients as MongoDBProduct["ingredients"]).map((ing) => ({
          inventoryItemId: ing.inventoryItemId || "",
          name: ing.name,
          quantity:
            typeof ing.quantity === "string"
              ? Number(ing.quantity)
              : ing.quantity,
          unit: ing.unit,
        }))
      : [],
    available: p.available !== undefined ? (p.available as boolean) : true,
    categoryId: p.categoryId as string,
    imageUrl: (p.imageUrl as string) || "",
    createdAt: p.createdAt as Date | undefined,
    updatedAt: p.updatedAt as Date | undefined,
  };
}

export async function GET() {
  try {
    // Fetch categories and products in parallel, sorting categories by creation date
    const [categories, products] = await Promise.all([
      MONGODB.collection("categories")
        .find({})
        .sort({ createdAt: -1 })
        .toArray(),
      MONGODB.collection("products").find({}).toArray(),
    ]);

    // Group products by categoryId mapping to avoid repeated nested loops
    const productsByCategoryId: Record<string, FormattedProduct[]> = {};
    for (const p of products) {
      const catId = p.categoryId as string;
      if (!productsByCategoryId[catId]) {
        productsByCategoryId[catId] = [];
      }
      productsByCategoryId[catId].push(formatProduct(p));
    }

    // Map grouped products back into each category
    const formattedCategories = categories.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      description: c.description,
      menuType: c.menuType,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      products: productsByCategoryId[c._id.toString()] || [],
    }));

    return NextResponse.json(formattedCategories);
  } catch (error: unknown) {
    console.error("❌ GET Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch categories",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CategoryInput = await request.json();
    console.log("📝 Adding category:", body);

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    const validMenuTypes: MongoDBCategory["menuType"][] = ["food", "drink"];
    const menuType: MongoDBCategory["menuType"] =
      body.menuType &&
      validMenuTypes.includes(body.menuType as MongoDBCategory["menuType"])
        ? (body.menuType as MongoDBCategory["menuType"])
        : "food";

    const newCategory = {
      name: body.name.trim(),
      description: body.description?.trim() || "",
      menuType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result =
      await MONGODB.collection("categories").insertOne(newCategory);
    console.log("✅ Category created:", result.insertedId);

    return NextResponse.json(
      { _id: result.insertedId.toString(), ...newCategory, products: [] },
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("❌ POST Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create category",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
