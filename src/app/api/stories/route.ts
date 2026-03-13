import { NextRequest, NextResponse } from "next/server";
import { Story } from "@/models/Story";
import { getDb } from "@/config/db";
import { uploadImage } from "@/lib/cloudinary";

// GET /api/stories
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const page = parseInt(url.searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const stories = await db
      .collection("stories")
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection("stories").countDocuments();

    return NextResponse.json({
      stories,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    });
  } catch (error: any) {
    console.error("Error fetching stories:", error);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}

// POST /api/stories
export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();

    const { authorId, authorName, authorImage, title, description, images } = body;

    if (!authorId || !authorName || !title || !images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: authorId, authorName, title, or images" },
        { status: 400 }
      );
    }

    // Process images (convert base64 to cloudinary URLs if needed)
    const processedImages: string[] = [];
    for (const img of images) {
      if (img.startsWith("data:image")) {
        try {
          const url = await uploadImage(img);
          processedImages.push(url);
        } catch (err) {
          console.error("Failed to upload image to cloudinary:", err);
          return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
        }
      } else {
        processedImages.push(img);
      }
    }

    const newStory = {
      authorId,
      authorName,
      authorImage: authorImage || "",
      title: title.trim(),
      description: description?.trim() || "",
      images: processedImages,
      likedBy: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("stories").insertOne(newStory);

    return NextResponse.json(
      { ...newStory, _id: result.insertedId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating story:", error);
    return NextResponse.json(
      { error: "Failed to create story" },
      { status: 500 }
    );
  }
}
