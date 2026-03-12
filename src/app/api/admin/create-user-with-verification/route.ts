import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MONGODB } from "@/config/db";

export async function POST(request: NextRequest) {
  try {
    // Get session to verify admin
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Check if user is admin
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { email, name, password, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const emailLower = email.trim().toLowerCase();

    // Use Better Auth's Admin API createUser
    // This doesn't log the user in (unlike signUpEmail)
    const result = await auth.api.createUser({
      body: {
        email: emailLower,
        name: name?.trim() || "",
        password,
        role: role || "staff",
      },
    });

    if (!result || !result.user) {
      throw new Error("Failed to create user");
    }

    const newUser = result.user;

    // Manually mark as verified if needed, or rely on the fact that admin created it
    await MONGODB.collection("user").updateOne(
      { id: newUser.id },
      { $set: { emailVerified: true } }
    );

    console.log("✅ User created successfully via Admin API:", emailLower);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: emailLower,
        name: name?.trim() || "",
        role: role || (newUser.role as string) || "staff",
      },
    });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
