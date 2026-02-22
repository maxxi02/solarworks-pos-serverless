// src/app/api/category-products/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";
import { ObjectId, WithId, Document } from "mongodb";
import {
  ProductIngredient,
  ProductInput,
  FormattedProduct,
} from "@/types/products";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

function formatProduct(product: WithId<Document>): FormattedProduct {
  return {
    _id: product._id.toString(),
    name: product.name as string,
    price: product.price as number,
    description: (product.description as string) || "",
    ingredients: Array.isArray(product.ingredients)
      ? (product.ingredients as ProductIngredient[]).map((ing) => ({
          inventoryItemId: ing.inventoryItemId || "",
          name: ing.name,
          quantity:
            typeof ing.quantity === "string"
              ? Number(ing.quantity)
              : ing.quantity,
          unit: ing.unit,
        }))
      : [],
    available:
      product.available !== undefined ? (product.available as boolean) : true,
    categoryId: product.categoryId as string,
    imageUrl: (product.imageUrl as string) || "",
    createdAt: product.createdAt as Date | undefined,
    updatedAt: product.updatedAt as Date | undefined,
  };
}

function validateIngredients(ingredients: ProductIngredient[]): string[] {
  const errors: string[] = [];
  ingredients.forEach((ing, index) => {
    if (!ing.inventoryItemId?.trim())
      errors.push(`Ingredient ${index + 1}: Inventory item ID is required`);
    if (!ing.name?.trim())
      errors.push(`Ingredient ${index + 1}: Name is required`);
    if (
      !ing.quantity ||
      isNaN(Number(ing.quantity)) ||
      Number(ing.quantity) <= 0
    )
      errors.push(`Ingredient ${index + 1}: Valid quantity is required`);
    if (!ing.unit?.trim())
      errors.push(`Ingredient ${index + 1}: Unit is required`);
  });
  return errors;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    const product = await MONGODB.collection("products").findOne({
      _id: new ObjectId(id),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(formatProduct(product));
  } catch (error: unknown) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: ProductInput = await request.json();

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    const errors: string[] = [];

    if (!body.name?.trim()) errors.push("Product name is required");
    if (!body.price || isNaN(Number(body.price)) || Number(body.price) <= 0)
      errors.push("Valid price is required");
    if (!body.categoryId?.trim()) errors.push("Category ID is required");

    if (!isValidObjectId(body.categoryId ?? "")) {
      errors.push("Invalid category ID");
    } else {
      const category = await MONGODB.collection("categories").findOne({
        _id: new ObjectId(body.categoryId),
      });
      if (!category) errors.push("Category not found");
    }

    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      errors.push("At least one ingredient is required");
    } else {
      errors.push(
        ...validateIngredients(body.ingredients as ProductIngredient[]),
      );
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 },
      );
    }

    const existingProduct = await MONGODB.collection("products").findOne({
      _id: new ObjectId(id),
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ingredients: ProductIngredient[] = (
      body.ingredients as ProductIngredient[]
    ).map((ing) => ({
      inventoryItemId: ing.inventoryItemId.trim(),
      name: ing.name.trim(),
      quantity: Number(ing.quantity),
      unit: ing.unit.trim(),
    }));

    const updateData = {
      name: body.name!.trim(),
      price: Number(body.price),
      description: body.description?.trim() || "",
      ingredients,
      available: body.available !== undefined ? Boolean(body.available) : true,
      categoryId: body.categoryId!,
      imageUrl: body.imageUrl?.trim() || "",
      updatedAt: new Date(),
    };

    const result = await MONGODB.collection("products").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      _id: id,
      ...updateData,
      createdAt: existingProduct.createdAt,
    });
  } catch (error: unknown) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid product ID format" },
        { status: 400 },
      );
    }

    const result = await MONGODB.collection("products").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
