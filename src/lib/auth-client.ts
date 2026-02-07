import { createAuthClient } from "better-auth/react";
import {
  twoFactorClient,
  adminClient,
  customSessionClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import type { auth } from "./auth";

// Create the auth client
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    twoFactorClient(),
    adminClient(),
    customSessionClient(),
  ],
});

// Export commonly used methods
export const { signIn, signUp, useSession, signOut } = authClient;
