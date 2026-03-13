import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/config/db";
import { ObjectId } from "mongodb";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId for like action" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("stories");

    // Check if user already liked
    const story = await collection.findOne({ _id: new ObjectId(id) });
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const isLiked = Array.isArray(story.likedBy) && story.likedBy.includes(userId);

    if (isLiked) {
      // Unlike
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $pull: { likedBy: userId } as any } // Using any because $pull with string array typing in mongoose is tricky
      );
    } else {
      // Like
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $addToSet: { likedBy: userId } }
      );
    }

    // Fetch updated
    const updated = await collection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      liked: !isLiked,
      likesCount: Array.isArray(updated?.likedBy) ? updated.likedBy.length : 0,
      likedBy: updated?.likedBy || [],
    });
  } catch (error: any) {
    console.error("Error toggling like:", error);
    return NextResponse.json(
      { error: "Failed to toggle like on story" },
      { status: 500 }
    );
  }
}
