// auth.ts
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { MONGODB } from "@/config/db";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin, twoFactor } from "better-auth/plugins";
import { sendVerificationEmailBrevo } from "./email";
import type { BetterAuthOptions } from "better-auth";
import type { User } from "better-auth/types";

interface EmailVerificationOptions {
  user: User;
  url: string;
}

export const auth = betterAuth({
  database: mongodbAdapter(MONGODB),
  appName: "POS SYSTEM",
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }: EmailVerificationOptions) => {
      await sendVerificationEmailBrevo({ user, url });
    },
    sendResetPassword: async ({ user, url }: EmailVerificationOptions) => {
      await sendVerificationEmailBrevo({ user, url });
    },
    sendOnSignIn: true,
  },

  plugins: [
    admin({ bannedUserMessage: "bawal ka na rito tado" }),
    twoFactor({
      issuer: "POS SYSTEM",
      skipVerificationOnEnable: true,
    }),
  ],
} as BetterAuthOptions);

export type Session = typeof auth.$Infer.Session;
