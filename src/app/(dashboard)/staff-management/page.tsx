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

export default function AccessControlPage() {
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";

  const {
    users,
    loading,
    rowSelection,
    setRowSelection,
    fetchUsers,
    refreshUsers,
    updateUserStatus,
  } = useUsers();

  // Real-time status updates
  useUserStatus((data) => {
    updateUserStatus(data.userId, data.isOnline, data.lastSeen);
  });

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const selectedUsers = React.useMemo(
    () =>
      Object.keys(rowSelection)
        .map((id) => users.find((u) => u.id === id))
        .filter((user): user is TableUser => user !== undefined),
    [rowSelection, users]
  );

  const columns = getColumns({ onRefresh: refreshUsers });

  return (
    <div className="container py-6 px-4">
      <Header isAdmin={isAdmin} onRefresh={refreshUsers} />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">All Users ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
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