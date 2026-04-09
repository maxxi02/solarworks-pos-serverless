import { NextResponse } from "next/server";
import { getFastSession } from "@/lib/fast-session";

export async function GET() {
  const fastSession = await getFastSession();
    
  return NextResponse.json({
    fastSessionFound: !!fastSession,
    user: fastSession?.user?.name
  });
}
