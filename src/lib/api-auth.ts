import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export type Role = "admin" | "staff" | "manager" | "customer" | "kiosk";

/**
 * Helper to require authentication and optional role-based authorization in API routes.
 * 
 * @param req The incoming NextRequest
 * @param allowedRoles Optional array of allowed roles. If omitted, any authenticated user is allowed.
 * @returns The session if authorized, or a NextResponse error if not.
 */
export async function requireAuth(req: Request, allowedRoles?: Role[]) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  // Check roles if specified
  if (allowedRoles && allowedRoles.length > 0) {
    // Note: Assuming session.user.role exists based on src/lib/auth.ts
    const userRole = (session.user as any).role as Role;
    
    if (!allowedRoles.includes(userRole)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: "Forbidden: Insufficient permissions" },
          { status: 403 }
        ),
      };
    }
  }

  return { authorized: true, session };
}
