import { UserRole } from "@/types/role.type";

export interface BetterAuthUser {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  lastActive?: Date | null;
  banned: boolean | null;
  banExpiresAt?: Date | null;
  banReason?: string | null;
  role?: UserRole;
  image?: string | null;
  isOnline?: boolean;
  phoneNumber?: string | null;
}

export interface TableUser extends Omit<BetterAuthUser, "banned"> {
  status: "active" | "banned" | "inactive";
  banned: boolean;
  payRange: string;
  isOnline?: boolean;
}
