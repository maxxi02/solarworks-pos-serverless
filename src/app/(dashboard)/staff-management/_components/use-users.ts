import { useState, useCallback } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { transformToTableUser } from "./user-helpers";
import { TableUser } from "./staffManagement.types";

export function useUsers() {
  const [users, setUsers] = useState<TableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authClient.admin.listUsers({
        query: { limit: 100, offset: 0 },
      });
      const mapped = (data?.users ?? []).map((user) =>
        transformToTableUser(user as any),
      );
      setUsers(mapped);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  const updateUserStatus = useCallback(
    (userId: string, isOnline: boolean, lastSeen?: Date) => {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                isOnline,
                lastActive: lastSeen || user.lastActive,
              }
            : user,
        ),
      );
    },
    [],
  );

  return {
    users,
    loading,
    rowSelection,
    setRowSelection,
    fetchUsers,
    refreshUsers,
    updateUserStatus,
  };
}
