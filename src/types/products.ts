// src/types/product.ts

// src/types/products.ts

export interface ProductVariant {
  name: string;
  price: number;
}

export interface RawMaterial {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock?: number;
  category: string;
  categoryName: string;
  variants?: ProductVariant[];
  rawMaterials?: RawMaterial[];
  imageUrl?: string;
  createdAt: string;
}

export type CategoryIcon = "coffee" | "utensils";

export interface Category {
  id: string;
  name: string;
  icon: CategoryIcon;
  products: Product[];
}

export interface ProductIngredient {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface MongoDBProduct {
  _id?: import("mongodb").ObjectId;
  name: string;
  price: number;
  description: string;
  ingredients: ProductIngredient[];
  available: boolean;
  categoryId: string;
  imageUrl?: string; // ← NEW: optional image URL or base64 string
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MongoDBCategory {
  _id?: import("mongodb").ObjectId;
  name: string;
  description: string;
  menuType: "food" | "drink";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FormattedProduct {
  _id: string;
  name: string;
  price: number;
  description: string;
  ingredients: ProductIngredient[];
  available: boolean;
  categoryId: string;
  imageUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FormattedCategory {
  _id: string;
  name: string;
  description: string;
  menuType: "food" | "drink";
  products: FormattedProduct[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IngredientInput {
  inventoryItemId: string;
  name: string;
  quantity: number | string;
  unit: string;
}

export interface ProductInput {
  name?: string;
  price?: number | string;
  description?: string;
  ingredients?: IngredientInput[];
  available?: boolean;
  categoryId?: string;
  imageUrl?: string;
}

export interface CategoryInput {
  name?: string;
  description?: string;
  menuType?: string;
}
