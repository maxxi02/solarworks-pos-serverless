import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { MONGODB } from "@/config/db";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin as adminPlugin, twoFactor } from "better-auth/plugins";
import { sendVerificationEmail } from "./email";
import { nextCookies } from "better-auth/next-js";
import { adminClient } from "better-auth/client/plugins";
import { UserRole } from "@/types/role.type";

export const auth = betterAuth({
  database: mongodbAdapter(MONGODB),
  appName: "POS SYSTEM",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    "https://rendezvous-cafe.vercel.app",
    "http://localhost:3001",
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  // USER SCHEMA EXTENSIONS
  user: {
    additionalFields: {
      phoneNumber: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "staff", // default to "staff" for all new users
      },
      isOnline: {
        type: "boolean",
        defaultValue: false,
        required: false,
      },
      lastSeen: {
        type: "date",
        defaultValue: () => new Date(),
        required: false,
      },

      // ─── STAFF FIELDS ────────────────────────────────
      salaryPerHour: { type: "number", required: false },
      dailyTargetHours: { type: "number", required: false, defaultValue: 8 },
      employmentType: {
        type: "string",
        required: false,
        defaultValue: "full-time",
        // you can also use enum if better-auth supports it in future
      },
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }, request?: Request) => {
      let tempPassword: string | undefined;

      if (request) {
        try {
          const clonedReq = request.clone();
          const body = await clonedReq.json();

          // Check if this is an admin-created user with tempPassword
          if (body?.tempPassword) {
            tempPassword = body.tempPassword as string;
          }
        } catch (e: unknown) {
          console.debug("No tempPassword in request:", e);
        }
      }

      await sendVerificationEmail({
        user,
        url,
        tempPassword,
      });

      console.log("✅ Verification email sent successfully");
    },
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: typeof auth.$Infer.Session.user;
      url: string;
    }) => {
      try {
        await sendVerificationEmail({ user, url });
        console.log("✅ Reset password email sent successfully");
      } catch (error) {
        console.error("❌ Failed to send reset password email:", error);
        throw error;
      }
    },
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      redirectURI:
        "https://rendezvous-cafe.vercel.app/api/auth/callback/google",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    adminPlugin(), // No roles config - we handle roles via custom field
    twoFactor({
      issuer: "POS SYSTEM",
      skipVerificationOnEnable: true,
    }),
    adminClient(),
    nextCookies(),
  ],
});

// Type definitions

export type ExtendedUser = typeof auth.$Infer.Session.user & {
  role?: UserRole;
  phoneNumber?: string;
  salaryPerHour?: number;
  dailyTargetHours?: number;
  employmentType?: "full-time" | "part-time" | "contractual";
  isOnline?: boolean;
  lastSeen?: Date;
};

export type ExtendedSession = {
  user: ExtendedUser;
  session: typeof auth.$Infer.Session.session;
};

export type Session = typeof auth.$Infer.Session;
