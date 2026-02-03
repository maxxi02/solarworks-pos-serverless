// auth.ts
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { MONGODB } from "@/config/db";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { twoFactor } from "better-auth/plugins"

export const auth = betterAuth({
  database: mongodbAdapter(MONGODB),
    appName: "My App", // provide your app name. It'll be used as an issuer.
    plugins: [
        twoFactor() 
    ]
})