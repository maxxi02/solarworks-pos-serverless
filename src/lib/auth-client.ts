import React from "react";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient, adminClient } from "better-auth/client/plugins";

// Create the auth client
export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [twoFactorClient(), adminClient()],
});

// Export commonly used methods
export const { signIn, signUp, useSession, signOut } = authClient;

// Types for Better Auth session
type BetterAuthSession = ReturnType<typeof useSession>['data'];

// Helper function to get current user from localStorage
export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  
  // Try to get session from Better Auth storage
  const sessionStr = localStorage.getItem("better-auth:session");
  
  if (!sessionStr) {
    // Also check for other possible storage keys
    const keys = Object.keys(localStorage).filter(key => 
      key.includes('better-auth') || key.includes('session')
    );
    
    for (const key of keys) {
      const data = localStorage.getItem(key);
      if (data?.includes('user')) {
        try {
          const parsed = JSON.parse(data);
          if (parsed?.user) return parsed.user;
        } catch {
          continue;
        }
      }
    }
    
    return null;
  }
  
  try {
    const session = JSON.parse(sessionStr);
    return session?.user || null;
  } catch (error) {
    console.error("Error parsing user session:", error);
    return null;
  }
};

// Alternative: Get user directly from useSession hook
export const useCurrentUser = () => {
  const { data: session } = useSession();
  
  const user = session?.user || null;
  
  // You can add loading state manually if needed
  const [isLoading, setIsLoading] = React.useState(!user);
  
  React.useEffect(() => {
    if (user) {
      setIsLoading(false);
    }
  }, [user]);
  
  return {
    user,
    isLoading: isLoading && !user,
    session
  };
};

// Helper function to get user role
export const getCurrentUserRole = (): 'admin' | 'staff' => {
  const user = getCurrentUser();
  
  if (!user) return 'staff';
  
  // Check role based on your MongoDB schema
  // Try different possible role fields
  const role = user.role || 
               user.userRole || 
               (user.roles?.includes('admin') ? 'admin' : 'staff') ||
               (user.isAdmin ? 'admin' : 'staff') ||
               'staff';
  
  return role === 'admin' ? 'admin' : 'staff';
};

// Helper function to get user initials
export const getUserInitials = (name?: string): string => {
  if (!name) return "US";
  
  return name
    .split(' ')
    .filter(part => part.trim().length > 0)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};

// Clear auth data (fallback for logout)
export const clearAuthData = () => {
  if (typeof window === 'undefined') return;
  
  // Clear all Better Auth related data
  const betterAuthKeys = Object.keys(localStorage).filter(key => 
    key.includes('better-auth')
  );
  
  betterAuthKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear your custom data
  localStorage.removeItem("solarworks_token");
  localStorage.removeItem("solarworks_user");
  
  // Clear session storage
  sessionStorage.clear();
  
  // Clear cookies that might be related to auth
  document.cookie.split(";").forEach(cookie => {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  });
};