// src/app/api/settings/portal/route.ts
// GET  — returns featured product IDs + enriched product details + branding
// PUT  — admin-only, upserts featured products + branding settings

import { NextRequest, NextResponse } from "next/server";
import MONGODB from "@/config/db";
import { auth } from "@/lib/auth";
import { ObjectId } from "mongodb";

// Default branding values (current hardcoded theme)
const DEFAULT_BRANDING = {
  primaryColor: "#E8621A", // orange brand colour
  accentColor: "#8B3A00", // deep amber
  logoText: "RENDEZVOUS CAFÉ", // text shown in the navbar
  logoUrl: "", // optional custom image logo
  logoFont: "Cardo", // Google Font family name for the logo
};

const COLLECTION = "portalSettings";
const SETTINGS_KEY = "main"; // singleton document key

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const settings = await MONGODB.collection(COLLECTION).findOne({
      key: SETTINGS_KEY,
    });

    const featuredProductIds: string[] = settings?.featuredProductIds ?? [];

    // Branding — merge stored values with defaults so new fields work immediately
    const branding = {
      ...DEFAULT_BRANDING,
      ...(settings?.branding ?? {}),
    };

    // Enrich with full product details if IDs exist
    let featuredProducts: object[] = [];
    if (featuredProductIds.length > 0) {
      const objectIds = featuredProductIds
        .map((id) => {
          try {
            return new ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ObjectId[];

      const products = await MONGODB.collection("products")
        .find({ _id: { $in: objectIds } })
        .toArray();

      // Preserve the order favoured by the admin selection
      const productMap: Record<string, object> = {};
      for (const p of products) {
        productMap[p._id.toString()] = {
          _id: p._id.toString(),
          name: p.name as string,
          price: p.price as number,
          description: (p.description as string) || "",
          imageUrl: (p.imageUrl as string) || "",
          available:
            p.available !== undefined ? (p.available as boolean) : true,
        };
      }

      featuredProducts = featuredProductIds
        .map((id) => productMap[id])
        .filter(Boolean);
    }

    return NextResponse.json({
      featuredProductIds,
      featuredProducts,
      branding,
    });
  } catch (error) {
    console.error("❌ GET /api/settings/portal error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portal settings" },
      { status: 500 },
    );
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    // Verify the caller is an admin
    const session = await auth.api.getSession({ headers: request.headers });
    const role = (session?.user as any)?.role;

    if (!session || role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { featuredProductIds, branding } = body;

    if (!Array.isArray(featuredProductIds)) {
      return NextResponse.json(
        { error: "featuredProductIds must be an array" },
        { status: 400 },
      );
    }

    // Validate that all IDs are valid MongoDB ObjectId strings (min 3, max 10)
    const sanitized: string[] = featuredProductIds
      .filter((id: unknown) => {
        if (typeof id !== "string") return false;
        try {
          new ObjectId(id);
          return true;
        } catch {
          return false;
        }
      })
      .slice(0, 10); // hard cap: 10 featured products max

    // Sanitize branding — only allow known string fields
    const safeBranding: Record<string, string> = {};
    if (branding && typeof branding === "object") {
      for (const key of [
        "primaryColor",
        "accentColor",
        "logoText",
        "logoUrl",
        "logoFont",
      ] as const) {
        if (typeof branding[key] === "string") {
          safeBranding[key] = branding[key];
        }
      }
    }

    await MONGODB.collection(COLLECTION).updateOne(
      { key: SETTINGS_KEY },
      {
        $set: {
          key: SETTINGS_KEY,
          featuredProductIds: sanitized,
          branding: safeBranding,
          updatedAt: new Date(),
          updatedBy: session.user.id,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({
      success: true,
      featuredProductIds: sanitized,
      branding: safeBranding,
    });
  } catch (error) {
    console.error("❌ PUT /api/settings/portal error:", error);
    return NextResponse.json(
      { error: "Failed to save portal settings" },
      { status: 500 },
    );
  }
}
