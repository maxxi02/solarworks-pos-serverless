// Raw Material type
export interface RawMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

// Variant type
export interface Variant {
  name: string;
  price: number;
}

// Product type
export interface Product {
  id: string;
  name: string;
  price: number;
  variants?: Variant[];
  rawMaterials?: RawMaterial[];
  category: string;
  categoryName: string;
  hasVariants: boolean;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

// Category type
export interface Category {
  id: string;
  name: string;
  icon: 'coffee' | 'utensils';
  products: Product[];
}