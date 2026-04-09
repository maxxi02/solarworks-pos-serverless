import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MONGODB } from "@/config/db";
import { requireAuth } from "@/lib/api-auth";
import { CreateUserSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ["admin"]);
    if (!authResult.authorized) return authResult.response!;

    const body = await request.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid user data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { email, name, password, role } = parsed.data;
    const emailLower = email.trim().toLowerCase();

    // Use Better Auth's Admin API createUser
    const result = await auth.api.createUser({
      body: {
        email: emailLower,
        name: name,
        password,
        role: role as any,
      },
    });

    if (!result || !result.user) {
      throw new Error("Failed to create user");
    }

    const newUser = result.user;

    // Manually mark as verified
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
        name: name,
        role: role,
      },
    });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
