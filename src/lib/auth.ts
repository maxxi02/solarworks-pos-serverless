// auth.ts
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { MONGODB } from "@/config/db";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  database: mongodbAdapter(MONGODB),
  appName: "POS SYSTEM",
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  plugins: [
    twoFactor({
      issuer: "POS SYSTEM",
      skipVerificationOnEnable: true,
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});

export type Session = typeof auth.$Infer.Session;
