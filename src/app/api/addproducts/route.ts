import { NextRequest, NextResponse } from "next/server";
import { MONGODB } from "@/config/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.category) {
      return NextResponse.json(
        { error: "Product name and category are required" },
        { status: 400 }
      );
    }

    // Validate price if no variants
    if (!body.hasVariants && (!body.basePrice || body.basePrice <= 0)) {
      return NextResponse.json(
        { error: "Price is required for products without variants" },
        { status: 400 }
      );
    }

    // Validate variants if hasVariants is true
    if (body.hasVariants && (!body.variants || body.variants.length === 0)) {
      return NextResponse.json(
        { error: "At least one variant is required for products with variants" },
        { status: 400 }
      );
    }

    // Connect to database
    const productsCollection = MONGODB.collection("products");
    
    // Check if product already exists
    const existingProduct = await productsCollection.findOne({
      name: body.name,
      category: body.category
    });
    
    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this name already exists in this category" },
        { status: 409 }
      );
    }

    // Prepare product data
    const productData = {
      name: body.name,
      category: body.category,
      categoryName: body.categoryName,
      basePrice: body.hasVariants ? 0 : parseFloat(body.basePrice),
      rawMaterials: body.rawMaterials || [],
      variants: body.hasVariants ? body.variants.filter((v: any) => v.name && v.price > 0) : [],
      hasVariants: body.hasVariants || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      stock: 0 // Default stock
    };

    // Insert into database
    const result = await productsCollection.insertOne(productData);
    
    return NextResponse.json({
      success: true,
      message: "Product added successfully",
      productId: result.insertedId,
      product: productData
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error adding product:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add product" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    
    const productsCollection = MONGODB.collection("products");
    
    // Build query
    const query: any = { isActive: true };
    if (category && category !== "all") {
      query.category = category;
    }
    
    // Fetch products
    const products = await productsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    // Transform the data to match frontend expectations
    const transformedProducts = products.map(product => ({
      id: product._id.toString(),
      name: product.name,
      price: product.basePrice,
      variants: product.hasVariants ? product.variants : undefined,
      rawMaterials: product.rawMaterials.length > 0 ? product.rawMaterials : undefined,
      category: product.category,
      categoryName: product.categoryName,
      hasVariants: product.hasVariants,
      stock: product.stock || 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));
    
    // Get unique categories for filtering
    const categories = await productsCollection.distinct("category");
    const categoriesWithNames = await productsCollection.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", name: { $first: "$categoryName" } } }
    ]).toArray();
    
    return NextResponse.json({
      success: true,
      products: transformedProducts,
      categories: categories.map(catId => {
        const cat = categoriesWithNames.find(c => c._id === catId);
        return {
          id: catId,
          name: cat?.name || catId.charAt(0).toUpperCase() + catId.slice(1)
        };
      })
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}