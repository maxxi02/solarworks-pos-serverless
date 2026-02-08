// permissions.ts (or wherever this lives)
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
} from "better-auth/plugins/organization/access";

export const statement = {
  ...defaultStatements,
  user: [
    "create",
    "update",
    "delete",
    "read",
    "view",
    "list", // ← add this!
    "ban", // optional, but useful for admin
    "unban",
    // "impersonate" if you want impersonation
  ],
} as const;

export const ac = createAccessControl(statement);

// Now give your roles the missing permission
export const staff = ac.newRole({
  user: ["create", "update", "delete", "read", "view", "list"], // add "list" here too if staff should list users
  ...adminAc.statements,
});

export const admin = ac.newRole({
  user: ["create", "update", "delete", "read", "view", "list", "ban", "unban"],
  ...adminAc.statements,
});

export const manager = ac.newRole({
  user: ["create", "update", "delete", "read", "view", "list"],
  ...adminAc.statements,
});
