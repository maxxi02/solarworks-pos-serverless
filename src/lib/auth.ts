// auth.ts
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { MONGODB } from "@/config/db";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin, twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  database: mongodbAdapter(MONGODB),
  appName: "POS SYSTEM",
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  logger: {
    disabled: false,
    disableColors: false,
    level: "debug", // ← change to "debug" to see everything (most verbose)
    // or "info" for a good middle ground
    log: (level, message, ...args) => {
      console.log(`[${level.toUpperCase()}] ${message}`, ...args);
    },
  },
  plugins: [
    admin({ bannedUserMessage: "bawal ka na rito tado" }),
    twoFactor({
      issuer: "POS SYSTEM",
      skipVerificationOnEnable: true,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
