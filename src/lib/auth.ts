import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { MONGODB } from "@/config/db";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin, twoFactor } from "better-auth/plugins";
import { sendVerificationEmailGmail } from "./email";

export const auth = betterAuth({
  database: mongodbAdapter(MONGODB),
  appName: "POS SYSTEM",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendVerificationEmailGmail({ user, url });
        console.log("✅ Verification email sent successfully");
      } catch (error) {
        console.error("❌ Failed to send verification email:", error);
        throw error;
      }
    },
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: typeof auth.$Infer.Session.user;
      url: string;
    }) => {
      try {
        await sendVerificationEmailGmail({ user, url });
        console.log("✅ Reset password email sent successfully");
      } catch (error) {
        console.error("❌ Failed to send reset password email:", error);
        throw error;
      }
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
