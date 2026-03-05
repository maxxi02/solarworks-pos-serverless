// GET  → returns current notif settings for the logged-in user
// POST → saves notif settings to the user document

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const user = await MONGODB.collection("user").findOne(
    { _id: new ObjectId(session.user.id) },
    { projection: { notifSettings: 1 } }
  );

  return NextResponse.json({
    success: true,
    settings: user?.notifSettings ?? { sound: true, vibration: true },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const body = await req.json() as { sound?: boolean; vibration?: boolean };

  await MONGODB.collection("user").updateOne(
    { _id: new ObjectId(session.user.id) },
    { $set: { notifSettings: { sound: !!body.sound, vibration: !!body.vibration } } }
  );

  return NextResponse.json({ success: true });
}
