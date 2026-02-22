// src/app/api/products/add/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";
import { ProductIngredient, ProductInput } from "@/types/products";

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

export async function POST(request: NextRequest) {
  try {
    const body: ProductInput = await request.json();
    const errors: string[] = [];

    if (!body.name?.trim()) errors.push("Product name is required");
    if (!body.price || isNaN(Number(body.price)) || Number(body.price) <= 0)
      errors.push("Valid price is required");
    if (!body.categoryId?.trim()) errors.push("Category ID is required");

    if (!ObjectId.isValid(body.categoryId ?? "")) {
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

    const ingredients: ProductIngredient[] = (
      body.ingredients as ProductIngredient[]
    ).map((ing) => ({
      inventoryItemId: ing.inventoryItemId.trim(),
      name: ing.name.trim(),
      quantity: Number(ing.quantity),
      unit: ing.unit.trim(),
    }));

    const newProduct = {
      name: body.name!.trim(),
      price: Number(body.price),
      description: body.description?.trim() || "",
      ingredients,
      available: body.available !== undefined ? Boolean(body.available) : true,
      categoryId: body.categoryId!,
      imageUrl: body.imageUrl?.trim() || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await MONGODB.collection("products").insertOne(newProduct);

    return NextResponse.json(
      { _id: result.insertedId.toString(), ...newProduct },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
