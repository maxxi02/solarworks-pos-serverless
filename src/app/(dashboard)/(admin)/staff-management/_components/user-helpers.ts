import { BetterAuthUser, TableUser, UserRole } from "./staffManagement.types";

export function transformToTableUser(user: BetterAuthUser): TableUser {
  const banned = user.banned ?? false;
  const status = getUserStatus(user);
  return {
    ...user,
    banned,
    status,
    role: user.role ?? "staff",
    payRange: getPayRange(user.role ?? "staff"),
    isOnline: user.isOnline ?? false,
  };
}

export function getUserStatus(user: BetterAuthUser): TableUser["status"] {
  if (user.banned === true) return "banned";
  if (user.lastActive) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (new Date(user.lastActive) < thirtyDaysAgo) return "inactive";
  }
  return "active";
}

export function getPayRange(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin: "$8,000 – $15,000",
    manager: "$5,500 – $10,000",
    staff: "$3,500 – $7,000",
    customer: "—",
    user: "—",
  };
  return map[role];
}
