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
    console.log("🔍 Fetching categories...");

    const categories = await MONGODB.collection("categories")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    console.log(`📊 Found ${categories.length} categories`);

    const products = await MONGODB.collection("products").find({}).toArray();
    console.log(`📊 Found ${products.length} products`);

    const categoriesWithProducts = categories.map((category) => ({
      _id: category._id.toString(),
      name: category.name as string,
      description: (category.description as string) || "",
      menuType: (category.menuType as MongoDBCategory["menuType"]) || "food",
      products: products
        .filter((p) => p.categoryId === category._id.toString())
        .map(formatProduct),
      createdAt: category.createdAt as Date | undefined,
      updatedAt: category.updatedAt as Date | undefined,
    }));

    console.log("✅ Categories fetched successfully");
    return NextResponse.json(categoriesWithProducts);
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
