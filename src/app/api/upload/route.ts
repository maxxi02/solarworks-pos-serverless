import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/lib/auth"; // adjust to your better-auth import

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function getResourceType(mimeType: string): "image" | "video" | "raw" | "auto" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "video"; // cloudinary uses 'video' for audio too
  return "raw";
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 25 MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const resourceType = getResourceType(file.type);

    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: resourceType,
      folder: "rendezvous/chat",
      use_filename: true,
      unique_filename: true,
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      type: resourceType === "raw" ? "document" : resourceType === "video" && file.type.startsWith("audio/") ? "audio" : resourceType,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      thumbnailUrl: resourceType === "image" ? result.secure_url : undefined,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const config = {
  api: { bodyParser: false },
};