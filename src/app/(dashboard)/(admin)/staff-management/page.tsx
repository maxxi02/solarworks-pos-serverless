"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import { authClient } from "@/lib/auth-client";
import { useUsers } from "./_components/use-users";
import { useUserStatus } from "./_components/use-user-status";
import { Header } from "./_components/user-display/header";
import { BulkActions } from "./_components/user-display/bulk-actions";
import { getColumns } from "./_components/user-display/columns";
import { TableUser } from "./_components/staffManagement.types";
import { transformToTableUser } from "./_components/user-helpers";

export default function AccessControlPage() {
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";

  const [users, setUsers] = React.useState<TableUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [rowSelection, setRowSelection] = React.useState<
    Record<string, boolean>
  >({});

  const fetchStaff = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/staff");
      const result = await response.json();
      if (result.success) {
        const mapped = result.data.map((user: any) =>
          transformToTableUser({
            ...user,
            id: user.id || user._id,
          }),
        );
        setUsers(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUsers = React.useCallback(async () => {
    await fetchStaff();
  }, [fetchStaff]);

  const updateUserStatus = React.useCallback(
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

  // Real-time status updates
  useUserStatus((data) => {
    updateUserStatus(data.userId, data.isOnline, data.lastSeen);
  });

  React.useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const selectedUsers = React.useMemo(
    () =>
      Object.keys(rowSelection)
        .map((id) => users.find((u) => u.id === id))
        .filter((user): user is TableUser => user !== undefined),
    [rowSelection, users],
  );

  const columns = getColumns({ onRefresh: refreshUsers });

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
      <Header isAdmin={isAdmin} onRefresh={refreshUsers} />

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Staff ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="pt-4">
          {selectedUsers.length > 0 && (
            <BulkActions
              selectedUsers={selectedUsers}
              onRefresh={refreshUsers}
              onClearSelection={() => setRowSelection({})}
            />
          )}

          <DataTable
            columns={columns}
            data={users}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            getRowId={(row) => row.id}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
