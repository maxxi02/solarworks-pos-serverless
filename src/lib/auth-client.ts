import { createAuthClient } from "better-auth/react";
import { twoFactorClient, adminClient } from "better-auth/client/plugins";

// Create the auth client
export const authClient = createAuthClient({
  plugins: [twoFactorClient(), adminClient()],
});

// Export commonly used methods
export const { signIn, signUp, useSession, signOut } = authClient;

// Helper function to get user role from session
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

// Simple wrapper to get user data from session (if needed elsewhere)
export const getUserFromSession = (session: any) => {
  return session?.user || null;
};