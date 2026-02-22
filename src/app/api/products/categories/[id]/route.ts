// src/app/api/categories/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id: categoryId } = await context.params;

    console.log("🗑️ Deleting category:", categoryId);

    if (!categoryId || categoryId === "categories") {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(categoryId)) {
      return NextResponse.json(
        { error: "Invalid category ID format" },
        { status: 400 },
      );
    }

    const objectId = new ObjectId(categoryId);

    const category = await MONGODB.collection("categories").findOne({
      _id: objectId,
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const productsCount = await MONGODB.collection("products").countDocuments({
      categoryId,
    });

    console.log(
      `📊 Found ${productsCount} products in category "${category.name as string}"`,
    );

    const deleteProductsResult = await MONGODB.collection(
      "products",
    ).deleteMany({
      categoryId,
    });

    console.log(`🗑️ Deleted ${deleteProductsResult.deletedCount} products`);

    await MONGODB.collection("categories").deleteOne({ _id: objectId });

    console.log("✅ Category deleted successfully");

    return NextResponse.json({
      success: true,
      message: `Category "${category.name as string}" deleted successfully`,
      deletedCategory: { name: category.name as string, id: categoryId },
      deletedProducts: deleteProductsResult.deletedCount,
    });
  } catch (error: unknown) {
    console.error("❌ DELETE Error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete category",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
