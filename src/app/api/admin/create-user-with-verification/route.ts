import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { headers } from "next/headers";
import crypto from "crypto";
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

    // Use Better Auth's signUpEmail API
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: emailLower,
        name: name?.trim() || "",
        password,
      },
    });

    if (!signUpResult || !signUpResult.user) {
      throw new Error("Failed to create user");
    }

    const newUserId = signUpResult.user.id;

    // Update user role if not default
    if (role && role !== "staff") {
      await MONGODB.collection("user").updateOne(
        { id: newUserId },
        { $set: { role, updatedAt: new Date() } },
      );
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Delete any existing tokens for this email
    await MONGODB.collection("verificationToken").deleteMany({
      identifier: emailLower,
    });

    // Create new verification token
    await MONGODB.collection("verificationToken").insertOne({
      identifier: emailLower,
      token,
      expiresAt,
    });

    // Create verification URL
    const verificationUrl = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/verify-email?token=${token}&callbackURL=/dashboard`;

    // Send verification email with temp password
    await sendVerificationEmail({
      user: {
        email: emailLower,
        name: name?.trim() || "User",
      },
      url: verificationUrl,
      tempPassword: password,
    });

    console.log("✅ User created successfully:", emailLower);
    console.log("✅ User ID:", newUserId);

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        email: emailLower,
        name: name?.trim() || "",
        role: role || "staff",
      },
    });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
