import { createAuthClient } from "better-auth/react";
import { twoFactorClient, adminClient, customSessionClient } from "better-auth/client/plugins";

// Create the auth client
export const authClient = createAuthClient({
  plugins: [twoFactorClient(), adminClient(), customSessionClient()],
});

// Export commonly used methods
export const { signIn, signUp, useSession, signOut } = authClient;
