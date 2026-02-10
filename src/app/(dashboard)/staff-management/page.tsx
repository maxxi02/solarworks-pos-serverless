"use client";

import * as React from "react";
import {
  IconDotsVertical,
  IconPlus,
  IconShield,
  IconUserCheck,
  IconUserX,
  IconTrash,
} from "@tabler/icons-react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { debounce } from "lodash";

import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataTable, DragHandle } from "@/components/data-table";

// ─── Better Auth ────────────────────────────────────────────────
import { authClient } from "@/lib/auth-client";

// Types
type UserRole = "admin" | "manager" | "staff" | "user";

interface BetterAuthUser {
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
}

interface TableUser extends Omit<BetterAuthUser, "banned"> {
  status: "active" | "banned" | "inactive";
  banned: boolean;
}

// Helper functions
function transformToTableUser(user: BetterAuthUser): TableUser {
  const banned = user.banned ?? false;
  const status = getUserStatus(user);

  return {
    ...user,
    banned,
    status,
    role: user.role ?? "user",
  };
}

function getUserStatus(user: BetterAuthUser): TableUser["status"] {
  if (user.banned === true) return "banned";
  if (user.lastActive) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (new Date(user.lastActive) < thirtyDaysAgo) {
      return "inactive";
    }
  }
  return "active";
}

// Badge Components
function RoleBadge({ role }: { role?: UserRole }) {
  const variantMap: Record<
    string,
    "destructive" | "default" | "secondary" | "outline"
  > = {
    admin: "destructive",
    manager: "default",
    staff: "secondary",
    user: "outline",
  };

  const icons: Record<string, React.ReactNode> = {
    admin: <IconShield className="size-3" />,
    manager: <IconUserCheck className="size-3" />,
    staff: <IconUserX className="size-3" />,
    user: null,
  };

  const display = role ?? "user";
  const variant = variantMap[display] ?? "outline";

  return (
    <Badge variant={variant} className="gap-1 capitalize">
      {icons[display]}
      {display}
    </Badge>
  );
}

function StatusBadge({ status }: { status: TableUser["status"] }) {
  const variantMap: Record<
    TableUser["status"],
    "destructive" | "default" | "secondary"
  > = {
    active: "default",
    banned: "destructive",
    inactive: "secondary",
  };

  return (
    <Badge variant={variantMap[status]} className="capitalize">
      {status}
    </Badge>
  );
}

// Invite User Dialog
interface InviteUserDialogProps {
  onSuccess: () => Promise<void>;
}

function InviteUserDialog({ onSuccess }: InviteUserDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("user");
  const [loading, setLoading] = React.useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);
    try {
      const { data: user, error } = await authClient.admin.createUser({
        email: email.trim(),
        name: name.trim(),
        password: Math.random().toString(36).slice(-12),
      });

      if (error) throw error;

      if (role !== "user" && user) {
        await authClient.admin.updateUser({
          userId: user.user.id,
          data: {
            customData: { role },
          },
        });
      }

      toast.success(`User invited: ${email}`);
      setOpen(false);
      setEmail("");
      setName("");
      setRole("user");
      await onSuccess();
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? "Failed to invite user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4 mr-2" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Create a new user account. They'll receive an email to set their
            password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email *</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? "Inviting..." : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// User Edit Drawer
interface UserEditDrawerProps {
  user: TableUser;
  onRefresh: () => Promise<void>;
}

function UserEditDrawer({ user, onRefresh }: UserEditDrawerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(user.name ?? "");
  const [role, setRole] = React.useState<UserRole>(user.role ?? "user");
  const [banReason, setBanReason] = React.useState("");
  const [banDays, setBanDays] = React.useState<number | "">("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(user.name ?? "");
    setRole(user.role ?? "user");
    setBanReason("");
    setBanDays("");
  }, [user.id, user.name, user.role]);

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      const updatePromises = [];

      if (name.trim() !== (user.name ?? "")) {
        updatePromises.push(
          authClient.admin.updateUser({
            userId: user.id,
            data: {
              name: name.trim() || null,
            },
          }),
        );
      }

      if (role !== user.role) {
        updatePromises.push(
          authClient.admin.updateUser({
            userId: user.id,
            data: {
              customData: { role },
            },
          }),
        );
      }

      const results = await Promise.all(updatePromises);
      const hasError = results.some((result) => result.error);
      if (hasError) {
        throw new Error("Failed to update user");
      }

      toast.success("User updated successfully");
      await onRefresh();
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleBan = async () => {
    if (!banReason.trim()) {
      toast.error("Please provide a ban reason");
      return;
    }
    try {
      const { error } = await authClient.admin.banUser({
        userId: user.id,
        banReason: banReason.trim(),
        banExpiresIn: banDays ? Number(banDays) * 86400 : undefined,
      });
      if (error) throw error;
      toast.success("User banned successfully");
      setOpen(false);
      await onRefresh();
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? "Ban failed");
    }
  };

  const handleUnban = async () => {
    try {
      const { error } = await authClient.admin.unbanUser({ userId: user.id });
      if (error) throw error;
      toast.success("User unbanned successfully");
      setOpen(false);
      await onRefresh();
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? "Unban failed");
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      const { error } = await authClient.admin.revokeUserSessions({
        userId: user.id,
      });
      if (error) throw error;
      toast.success("All sessions revoked");
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? "Failed to revoke sessions");
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerTrigger asChild>
        <Button variant="link" className="px-0 text-left font-medium">
          {user.name || user.email.split("@")[0]}
        </Button>
      </DrawerTrigger>

      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{user.email}</DrawerTitle>
          <DrawerDescription>Manage user profile and access</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-6 overflow-y-auto">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="flex items-center gap-2">
              <Input value={user.email} disabled className="flex-1" />
              {user.emailVerified ? (
                <Badge variant="default">Verified</Badge>
              ) : (
                <Badge variant="outline">Unverified</Badge>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <StatusBadge status={user.status} />
            {user.banned && user.banReason && (
              <p className="text-sm text-destructive mt-1">
                Reason: {user.banReason}
              </p>
            )}
            {user.banned && user.banExpiresAt && (
              <p className="text-sm text-muted-foreground">
                Expires:{" "}
                {formatDistanceToNow(new Date(user.banExpiresAt), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Joined</Label>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(user.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>

          {user.lastActive && (
            <div className="space-y-1.5">
              <Label>Last Active</Label>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(user.lastActive), {
                  addSuffix: true,
                })}
              </p>
            </div>
          )}

          {user.status !== "banned" && (
            <div className="space-y-3 border-t pt-4">
              <Label>Ban User</Label>
              <Textarea
                placeholder="Ban reason (required)"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ban-days">Expires in (days) — optional</Label>
                  <Input
                    id="ban-days"
                    type="number"
                    min={1}
                    value={banDays}
                    onChange={(e) =>
                      setBanDays(e.target.value ? Number(e.target.value) : "")
                    }
                  />
                </div>
                <div className="self-end">
                  <Button
                    variant="destructive"
                    onClick={handleBan}
                    disabled={!banReason.trim()}
                  >
                    Apply Ban
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveDetails} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {user.status === "banned" ? (
              <Button variant="default" onClick={handleUnban}>
                Unban User
              </Button>
            ) : null}
            <Button variant="outline" onClick={handleRevokeAllSessions}>
              Revoke Sessions
            </Button>
          </div>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// Delete User Dialog
interface DeleteUserDialogProps {
  userId: string;
  userName: string;
  onSuccess: () => Promise<void>;
}

function DeleteUserDialog({
  userId,
  userName,
  onSuccess,
}: DeleteUserDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await authClient.admin.removeUser({
        userId,
      });
      if (error) throw error;

      toast.success("User deleted successfully");
      setOpen(false);
      await onSuccess();
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <IconTrash className="size-4 mr-2" />
        Delete User
      </DropdownMenuItem>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{userName}</strong>? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Bulk Actions Component
interface BulkActionsProps {
  selectedUsers: TableUser[];
  onRefresh: () => Promise<void>;
  onClearSelection: () => void;
}

function BulkActions({
  selectedUsers,
  onRefresh,
  onClearSelection,
}: BulkActionsProps) {
  const [roleChangeOpen, setRoleChangeOpen] = React.useState(false);
  const [newRole, setNewRole] = React.useState<UserRole>("user");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleBulkRoleChange = async () => {
    setLoading(true);
    try {
      const promises = selectedUsers.map((user) =>
        authClient.admin.updateUser({
          userId: user.id,
          data: {
            customData: { role: newRole },
          },
        }),
      );

      const results = await Promise.all(promises);
      const hasError = results.some((result) => result.error);

      if (hasError) {
        throw new Error("Some role updates failed");
      }

      toast.success(`Updated ${selectedUsers.length} user(s)`);
      setRoleChangeOpen(false);
      onClearSelection();
      await onRefresh();
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? "Bulk role change failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const promises = selectedUsers.map((user) =>
        authClient.admin.removeUser({
          userId: user.id,
        }),
      );

      const results = await Promise.all(promises);
      const hasError = results.some((result) => result.error);

      if (hasError) {
        throw new Error("Some deletions failed");
      }

      toast.success(`Deleted ${selectedUsers.length} user(s)`);
      setDeleteOpen(false);
      onClearSelection();
      await onRefresh();
    } catch (err) {
      const error = err as Error;
      toast.error(error?.message ?? "Bulk delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-muted/60 p-3 rounded-lg flex items-center justify-between">
      <span className="text-sm font-medium">
        {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""}{" "}
        selected
      </span>
      <div className="flex gap-2">
        <Dialog open={roleChangeOpen} onOpenChange={setRoleChangeOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Change Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role for Selected Users</DialogTitle>
              <DialogDescription>
                Update the role for {selectedUsers.length} selected user(s).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Role</Label>
                <Select
                  value={newRole}
                  onValueChange={(v) => setNewRole(v as UserRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRoleChangeOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleBulkRoleChange} disabled={loading}>
                {loading ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive">
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Users</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedUsers.length} user(s)?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                disabled={loading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// Column definitions
const getColumns = (onRefresh: () => Promise<void>): ColumnDef<TableUser>[] => [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.id} />,
    enableSorting: false,
    size: 40,
  },
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => (
      <UserEditDrawer user={row.original} onRefresh={onRefresh} />
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    id: "role",
    header: "Role",
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "joined",
    header: "Joined",
    accessorKey: "createdAt",
    cell: ({ row }) =>
      formatDistanceToNow(new Date(row.original.createdAt), {
        addSuffix: true,
      }),
  },
  {
    id: "lastActive",
    header: "Last Active",
    cell: ({ row }) =>
      row.original.lastActive
        ? formatDistanceToNow(new Date(row.original.lastActive), {
            addSuffix: true,
          })
        : "—",
  },
  {
    id: "actions",
    header: () => null,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <IconDotsVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={async () => {
              try {
                const { data, error } = await authClient.admin.listUserSessions(
                  {
                    userId: row.original.id,
                  },
                );
                if (error) throw error;
                toast.info(`Active sessions: ${data?.sessions?.length ?? 0}`);
              } catch (err) {
                toast.error("Failed to fetch sessions", {
                  description: (err as Error)?.message,
                });
              }
            }}
          >
            View Sessions
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              toast.info("Impersonation requires custom implementation");
            }}
          >
            Impersonate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DeleteUserDialog
            userId={row.original.id}
            userName={row.original.name || row.original.email}
            onSuccess={onRefresh}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 60,
  },
];

// Main Access Control Page
export default function AccessControlPage() {
  const [users, setUsers] = React.useState<TableUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [totalCount, setTotalCount] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<
    TableUser["status"] | "all"
  >("all");

  const [rowSelection, setRowSelection] = React.useState<
    Record<string, boolean>
  >({});
  const [sorting, setSorting] = React.useState<any[]>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 15,
  });

  const debouncedSearch = React.useMemo(
    () =>
      debounce((value: string) => {
        setSearch(value);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      }, 420),
    [],
  );

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const offset = pagination.pageIndex * pagination.pageSize;

      const query: Record<string, unknown> = {
        limit: pagination.pageSize,
        offset,
        sortBy: sorting[0]?.id ?? "createdAt",
        sortDirection: sorting[0]?.desc ? "desc" : "asc",
      };

      if (search.trim()) {
        query.searchValue = search.trim();
        query.searchField = "email";
        query.searchOperator = "contains";
      }

      const { data, error } = await authClient.admin.listUsers({ query });

      if (error) throw error;

      const rawUsers = (data?.users as BetterAuthUser[]) ?? [];
      const mappedUsers = rawUsers.map(transformToTableUser);

      let filteredUsers = mappedUsers;

      if (roleFilter !== "all") {
        filteredUsers = filteredUsers.filter(
          (user) => user.role === roleFilter,
        );
      }

      if (statusFilter !== "all") {
        filteredUsers = filteredUsers.filter(
          (user) => user.status === statusFilter,
        );
      }

      setUsers(filteredUsers);
      setTotalCount(data?.total ?? filteredUsers.length);
    } catch (err) {
      console.error("Failed to load users:", err);
      toast.error("Failed to load users");
      setUsers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sorting,
    roleFilter,
    statusFilter,
  ]);

  React.useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const selectedUsers = React.useMemo(() => {
    return Object.keys(rowSelection)
      .filter((id) => rowSelection[id])
      .map((id) => users.find((user) => user.id === id))
      .filter((user): user is TableUser => user !== undefined);
  }, [rowSelection, users]);

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Access Control</h1>
        <p className="text-muted-foreground mt-1">
          Manage users, roles, bans, and sessions
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <InviteUserDialog onSuccess={fetchUsers} />
          </div>
        </div>

        <TabsContent value="users" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search name or email..."
              className="max-w-sm"
              defaultValue={search}
              onChange={(e) => debouncedSearch(e.target.value)}
            />

            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as UserRole | "all");
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as TableUser["status"] | "all");
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk actions */}
          {selectedUsers.length > 0 && (
            <BulkActions
              selectedUsers={selectedUsers}
              onRefresh={fetchUsers}
              onClearSelection={() => setRowSelection({})}
            />
          )}

          {/* Table */}
          <DataTable
            columns={getColumns(fetchUsers)}
            data={users}
            enableDragAndDrop={true}
            enableRowSelection={false}
            enablePagination={true}
            loading={loading}
            loadingMessage="Loading users..."
            emptyMessage="No users found."
            manualPagination={true}
            pageCount={Math.ceil(totalCount / pagination.pageSize)}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            sorting={sorting}
            onSortingChange={setSorting}
            onPaginationChange={setPagination}
            getRowId={(row) => row.id}
            onDragEnd={(newData) => setUsers(newData)}
            totalCount={totalCount}
            pageSizeOptions={[10, 15, 25, 50]}
            initialPageSize={15}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
