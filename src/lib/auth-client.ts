import { createAuthClient } from "better-auth/react";
import { twoFactorClient, adminClient } from "better-auth/client/plugins";

// Create the auth client
export const authClient = createAuthClient({
  plugins: [twoFactorClient(), adminClient()],
});

// Export commonly used methods
export const { signIn, signUp, useSession, signOut } = authClient;

// Helper function to get current user - using Better Auth's API
export const getCurrentUser = async () => {
  try {
    // Better Auth provides a way to get the current session
    // Use their API endpoint to get the current user
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/get-session`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for cookies
      },
    );

    if (response.ok) {
      const data = await response.json();
      return data.user || null;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user session:", error);
    return null;
  }
};

// Helper function to get user role
export const getCurrentUserRole = (user: any): "admin" | "staff" => {
  if (!user) return "staff";

  // Based on your MongoDB data, role is stored as "admin" or "staff"
  const role = user.role;

  // Return 'admin' only if role is exactly "admin"
  if (role === "admin") {
    return "admin";
  }

  // Default to staff for any other value
  return "staff";
};

// Helper function to get user initials
export const getUserInitials = (name?: string): string => {
  if (!name) return "US";

  return name
    .split(" ")
    .filter((part) => part.trim().length > 0)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
