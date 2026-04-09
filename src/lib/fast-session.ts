import { cookies } from "next/headers";
import { CLIENT } from "@/config/db";
import { ObjectId } from "mongodb";

/**
 * A highly optimized session getter that bypasses the better-auth HTTP fetch overhead.
 * In Next.js App Router, using auth.api.getSession() with headers can cause loopback requests
 * that take 30+ seconds to resolve on serverless environments.
 * 
 * This directly reads the cookie and does a single indexed MongoDB query.
 */
export async function getFastSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("pos-system_session_token")?.value
      || cookieStore.get("__Secure-pos-system_session_token")?.value
      || cookieStore.get("pos-system.session_token")?.value
      || cookieStore.get("__Secure-pos-system.session_token")?.value
      || cookieStore.get("better-auth.session_token")?.value
      || cookieStore.get("__Secure-better-auth.session_token")?.value;

    if (!token) {
      return null;
    }

    const db = CLIENT.db();

    // In Better Auth, wait does it hash by default? 
    // Let's also check a few potential hashed forms
    const crypto = await import('crypto');
    const sha256Hex = crypto.createHash('sha256').update(token).digest('hex');

    let session = await db.collection("session").findOne({ token });
    if (!session) {
      session = await db.collection("session").findOne({ token: sha256Hex });
    }

    if (!session) {
      return null;
    }

    // Handle cases where Better Auth stores userId as ObjectId or string
    const userQueryId = typeof session.userId === 'string'
      ? new ObjectId(session.userId)
      : session.userId;

    const user = await db.collection("user").findOne({ _id: userQueryId });

    if (!user) {
      return null;
    }

    return {
      session: {
        id: session._id.toString(),
        userId: typeof session.userId === 'object' && session.userId ? session.userId.toString() : session.userId,
        token: session.token,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      },
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        pin: user.pin,
      }
    };
  } catch (error: any) {
    console.warn("getFastSession error:", error.message);
    return null;
  }
}
