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
    const categoriesWithProducts = await MONGODB.collection("categories").aggregate([
      { $sort: { createdAt: -1 } },
      {
        $addFields: { 
          idString: { $toString: "$_id" } 
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "idString",
          foreignField: "categoryId",
          as: "rawProducts"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          menuType: 1,
          createdAt: 1,
          updatedAt: 1,
          products: {
            $map: {
              input: "$rawProducts",
              as: "p",
              in: {
                _id: { $toString: "$$p._id" },
                name: "$$p.name",
                price: "$$p.price",
                description: { $ifNull: ["$$p.description", ""] },
                available: { $ifNull: ["$$p.available", true] },
                categoryId: "$$p.categoryId",
                imageUrl: { $ifNull: ["$$p.imageUrl", ""] },
                ingredients: {
                  $map: {
                    input: { $ifNull: ["$$p.ingredients", []] },
                    as: "ing",
                    in: {
                      inventoryItemId: { $ifNull: ["$$ing.inventoryItemId", ""] },
                      name: "$$ing.name",
                      quantity: { $convert: { input: "$$ing.quantity", to: "double", onError: 0, onNull: 0 } },
                      unit: "$$ing.unit"
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]).toArray();

    return NextResponse.json(categoriesWithProducts.map(c => ({
      ...c,
      _id: c._id.toString()
    })));
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
