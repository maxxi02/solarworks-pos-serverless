// staff-list.types.ts
export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  role?: string;
  status?: "active" | "inactive" | "suspended";
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

// Match Better-Auth's exact expected types
export interface UserFilters {
  searchValue?: string;
  searchField?: "name" | "email";
  searchOperator?: "contains" | "starts_with" | "ends_with";
  filterField?: "email" | "role" | "status";
  filterValue?: string;
  filterOperator?:
    | "contains"
    | "eq"
    | "starts_with"
    | "ends_with"
    | "gt"
    | "gte"
    | "lt"
    | "lte";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  page: number;
  limit: number;
}

export type UserColumn = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  emailVerified: boolean;
};
