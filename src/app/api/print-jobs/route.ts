// app/api/print-jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/config/db-Connect"; // ← your existing helper

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await connectToDatabase();

    const doc = {
      content: body.content ?? "",
      connectionType: body.connectionType ?? null,
      status: body.status ?? "pending",
      timestamp: new Date(body.timestamp ?? Date.now()),
      createdAt: new Date(),
    };

    const result = await db.collection("print_jobs").insertOne(doc);
    return NextResponse.json(
      { success: true, id: result.insertedId },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ POST /api/print-jobs failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const db = await connectToDatabase();
    const jobs = await db
      .collection("print_jobs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ success: true, jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ GET /api/print-jobs failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
