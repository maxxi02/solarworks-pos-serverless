import { createAccessControl } from "better-auth/plugins/access";

/**
 * make sure to use `as const` so typescript can infer the type correctly
 */
const statement = {
  project: ["create", "share", "update", "delete"],
} as const;

const ac = createAccessControl(statement);
