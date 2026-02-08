// src/proxy.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    // Run on almost everything except static/assets/api/auth itself
    "/((?!_next/static|_next/image|favicon.ico|api/auth/|_next/data).*)",
    // Explicitly include your protected base paths (helps reliability)
    "/dashboard/:path*",
    "/sales/:path*",
    "/inventory/:path*",
    "/customers/:path*",
    "/staff/:path*",
    "/staff-management/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/pos",
    "/my-sales/:path*",
    // Add any other protected root paths here
  ],
};

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const { pathname } = request.nextUrl;

  // ────────────────────────────────────────────────
  // 1. Define protected paths (coarse check — everything under these is protected)
  // ────────────────────────────────────────────────
  const protectedPrefixes = [
    "/dashboard",
    "/sales",
    "/inventory",
    "/customers",
    "/staff",
    "/staff-management",
    "/reports",
    "/settings",
    "/pos",
    "/my-sales",
  ];

  const isProtectedPath = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );

  // ────────────────────────────────────────────────
  // 2. Unauthenticated → redirect if trying protected path
  // ────────────────────────────────────────────────
  if (!session?.user) {
    if (isProtectedPath) {
      const signInUrl = new URL("/", request.url);
      signInUrl.searchParams.set("redirect", pathname); // optional: preserve where they wanted to go
      return NextResponse.redirect(signInUrl);
    }

    // Public paths (landing, sign-in, sign-up, etc.) → continue
    return NextResponse.next();
  }

  // ────────────────────────────────────────────────
  // 3. Authenticated → role-based restrictions (your existing logic)
  // ────────────────────────────────────────────────
  const role = session.user.role as "admin" | "manager" | "staff" | undefined;

  if (role === "staff") {
    const forbiddenForStaff = [
      "/sales/all-transactions",
      "/sales/sales-analytics",
      "/sales/refund-and-return",
      "/inventory/addproduct",
      "/inventory/categories",
      "/inventory/stockalert",
      "/inventory/reports",
      "/customers",
      "/staff",
      "/staff-management",
      "/reports",
      "/settings/store-setting",
      "/settings/receipt-setting",
      "/settings/payments-methods",
    ];

    if (
      forbiddenForStaff.some((p) => pathname.startsWith(p) || pathname === p)
    ) {
      return NextResponse.redirect(new URL("/pos", request.url));
    }
  }

  if (role === "manager") {
    if (
      pathname.startsWith("/staff") ||
      pathname.startsWith("/staff-management") ||
      pathname.includes("/settings/store-setting") ||
      pathname.includes("/settings/payments-methods")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Admin or allowed → proceed
  return NextResponse.next();
}
