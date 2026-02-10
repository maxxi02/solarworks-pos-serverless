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
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataTable, DragHandle } from "@/components/data-table";

import { authClient } from "@/lib/auth-client";
import { socketClient, UserStatusUpdate } from "@/lib/socket-client";

// ─── Types ───────────────────────────────────────────────────────
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
  isOnline?: boolean; // Added
}

interface TableUser extends Omit<BetterAuthUser, "banned"> {
  status: "active" | "banned" | "inactive";
  banned: boolean;
  payRange: string;
  isOnline?: boolean; // Added
}

// ─── Helpers ─────────────────────────────────────────────────────
function transformToTableUser(user: BetterAuthUser): TableUser {
  const banned = user.banned ?? false;
  const status = getUserStatus(user);
  return {
    ...user,
    banned,
    status,
    role: user.role ?? "user",
    payRange: getPayRange(user.role ?? "user"),
    isOnline: user.isOnline ?? false,
  };
}

function getUserStatus(user: BetterAuthUser): TableUser["status"] {
  if (user.banned === true) return "banned";
  if (user.lastActive) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (new Date(user.lastActive) < thirtyDaysAgo) return "inactive";
  }
  return "active";
}

function getPayRange(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin: "$8,000 – $15,000",
    manager: "$5,500 – $10,000",
    staff: "$3,500 – $7,000",
    user: "$2,000 – $4,500",
  };
  return map[role] ?? "—";
}

// ─── Badges ──────────────────────────────────────────────────────
function RoleBadge({ role }: { role?: UserRole }) {
  const variantMap: Record<UserRole, "destructive" | "default" | "secondary" | "outline"> = {
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
  return (
    <Badge
      variant={variantMap[display] ?? "outline"}
      className="gap-1.5 capitalize"
    >
      {icons[display]}
      {display}
    </Badge>
  );
}

function StatusBadge({ status }: { status: TableUser["status"] }) {
  const variantMap: Record<TableUser["status"], "destructive" | "default" | "secondary"> = {
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

// ─── Online Status Badge (Updated) ───────────────────────────────
function OnlineStatusBadge({
  isOnline,
  lastActive,
}: {
  isOnline?: boolean;
  lastActive?: Date | null;
}) {
  const online = isOnline ?? false;

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? "bg-green-500" : "bg-gray-400"
            }`}
        />
      </span>
      <div className="flex flex-col">
        <span
          className={`text-sm font-medium ${online ? "text-green-700" : "text-muted-foreground"
            }`}
        >
          {online ? "Online" : "Offline"}
        </span>
        {lastActive && !online && (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(lastActive), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Add User Dialog ─────────────────────────────────────────────
function AddUserDialog({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("user");
  const [loading, setLoading] = React.useState(false);

  const handleAdd = async () => {
    if (!email.trim()) return toast.error("Email is required");
    setLoading(true);
    try {
      const { data: user, error } = await authClient.admin.createUser({
        email: email.trim(),
        name: name.trim(),
        password: Math.random().toString(36).slice(-12),
      });
      if (error) throw error;

      if (role !== "user" && user?.user?.id) {
        await authClient.admin.updateUser({
          userId: user.user.id,
          data: { customData: { role } },
        });
      }

      toast.success(`User created: ${email}`);
      setOpen(false);
      setEmail("");
      setName("");
      setRole("user");
      await onSuccess();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create user";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <IconPlus className="size-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
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
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create New Staff Dialog ─────────────────────────────────────
function CreateStaffDialog({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleCreate = async () => {
    if (!email.trim()) return toast.error("Email is required");
    setLoading(true);
    try {
      const { data: user, error } = await authClient.admin.createUser({
        email: email.trim(),
        name: name.trim(),
        password: Math.random().toString(36).slice(-12),
      });
      if (error) throw error;

      if (user?.user?.id) {
        await authClient.admin.updateUser({
          userId: user.user.id,
          data: { customData: { role: "staff" } },
        });
      }

      toast.success(`Staff member created: ${email}`);
      setOpen(false);
      setEmail("");
      setName("");
      await onSuccess();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create staff";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4 mr-2" />
          Create New Staff
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Staff Member</DialogTitle>
          <DialogDescription>Role will be set to Staff.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Staff</Badge>
              <span className="text-sm text-muted-foreground">(fixed)</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── User Edit Drawer ────────────────────────────────────────────
function UserEditDrawer({
  user,
  onRefresh,
}: {
  user: TableUser;
  onRefresh: () => Promise<void>;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(user.name ?? "");
  const [role, setRole] = React.useState<UserRole>(user.role ?? "user");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = [];
      if (name.trim() !== (user.name ?? "")) {
        promises.push(
          authClient.admin.updateUser({
            userId: user.id,
            data: { name: name.trim() || null },
          }),
        );
      }
      if (role !== user.role) {
        promises.push(
          authClient.admin.updateUser({
            userId: user.id,
            data: { customData: { role } },
          }),
        );
      }
      await Promise.all(promises);
      toast.success("Updated");
      await onRefresh();
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerTrigger asChild>
        <Button variant="link" className="px-0">
          {user.name || user.email.split("@")[0]}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{user.email}</DrawerTitle>
        </DrawerHeader>
        <DrawerFooter>
          <Button onClick={handleSave} disabled={saving}>
            Save
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Delete Dialog ───────────────────────────────────────────────
function DeleteUserDialog({
  userId,
  userName,
  onSuccess,
}: {
  userId: string;
  userName: string;
  onSuccess: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await authClient.admin.removeUser({ userId });
      if (error) throw error;
      toast.success("Deleted");
      await onSuccess();
    } catch {
      toast.error("Delete failed");
    } finally {
      setLoading(false);
      setOpen(false);
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
        <IconTrash className="size-4 mr-2" /> Delete
      </DropdownMenuItem>
      <AlertDialogContent>
        <AlertDialogTitle>Delete User</AlertDialogTitle>
        <AlertDialogDescription>Delete {userName}?</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Bulk Actions ────────────────────────────────────────────────
function BulkActions({
  selectedUsers,
  onRefresh,
  onClearSelection,
}: {
  selectedUsers: TableUser[];
  onRefresh: () => Promise<void>;
  onClearSelection: () => void;
}) {
  const [roleOpen, setRoleOpen] = React.useState(false);
  const [newRole, setNewRole] = React.useState<UserRole>("user");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleRoleChange = async () => {
    setLoading(true);
    try {
      await Promise.all(
        selectedUsers.map((u) =>
          authClient.admin.updateUser({
            userId: u.id,
            data: { customData: { role: newRole } },
          }),
        ),
      );
      toast.success("Roles updated");
      setRoleOpen(false);
      onClearSelection();
      await onRefresh();
    } catch {
      toast.error("Role update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      await Promise.all(
        selectedUsers.map((u) => authClient.admin.removeUser({ userId: u.id })),
      );
      toast.success("Deleted");
      setDeleteOpen(false);
      onClearSelection();
      await onRefresh();
    } catch {
      toast.error("Bulk delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-muted p-3 rounded-lg flex justify-between items-center mb-4">
      <span>{selectedUsers.length} selected</span>
      <div className="flex gap-2">
        <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Change Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Change Role</DialogTitle>
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
            <DialogFooter>
              <Button onClick={handleRoleChange} disabled={loading}>
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
            <AlertDialogTitle>Delete Selected</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} disabled={loading}>
                {loading ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ─── Columns ─────────────────────────────────────────────────────
const getColumns = (onRefresh: () => Promise<void>): ColumnDef<TableUser>[] => [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.id} />,
    size: 40,
  },
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => (
      <UserEditDrawer user={row.original} onRefresh={onRefresh} />
    ),
  },
  { accessorKey: "email", header: "Email" },
  {
    id: "role",
    header: "Role",
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
  },
  {
    id: "online",
    header: "Status",
    cell: ({ row }) => (
      <OnlineStatusBadge
        isOnline={row.original.isOnline}
        lastActive={row.original.lastActive}
      />
    ),
  },
  {
    id: "payRange",
    header: "Pay Range",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.payRange}</span>
    ),
  },
  {
    id: "status",
    header: "Account",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "joined",
    header: "Joined",
    cell: ({ row }) =>
      formatDistanceToNow(new Date(row.original.createdAt), {
        addSuffix: true,
      }),
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
          <DeleteUserDialog
            userId={row.original.id}
            userName={row.original.name || row.original.email.split("@")[0]}
            onSuccess={onRefresh}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    size: 60,
  },
];

// ─── Main Component ──────────────────────────────────────────────
export default function AccessControlPage() {
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";

  const [users, setUsers] = React.useState<TableUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  // ─── Fetch Users ─────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await authClient.admin.listUsers({
        query: { limit: 100, offset: 0 },
      });
      const mapped = (data?.users ?? []).map((user) =>
        transformToTableUser(user as BetterAuthUser),
      );
      setUsers(mapped);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  // ─── Real-time Status Updates ────────────────────────────────────
  React.useEffect(() => {
    const handleStatusChange = (data: UserStatusUpdate) => {
      console.log(
        "🔴 STATUS EVENT RECEIVED IN TABLE PAGE",
        data.userId,
        data.isOnline ? "→ ONLINE" : "→ OFFLINE",
        "lastSeen:", data.lastSeen
      );

      setUsers((prev) => {
        const exists = prev.some(u => u.id === data.userId);
        console.log(`User ${data.userId} exists in list? → ${exists}`);

        return prev.map((user) =>
          user.id === data.userId
            ? {
              ...user,
              isOnline: data.isOnline,
              lastActive: data.lastSeen ? new Date(data.lastSeen) : user.lastActive,
            }
            : user
        );
      });
    };

    console.log("Attaching status listener now...");
    socketClient.onStatusChanged(handleStatusChange);

    return () => {
      console.log("Removing status listener");
      socketClient.offStatusChanged(handleStatusChange);
    };
  }, []);

  const selectedUsers = React.useMemo(
    () =>
      Object.keys(rowSelection)
        .map((id) => users.find((u) => u.id === id))
        .filter(Boolean) as TableUser[],
    [rowSelection, users],
  );

  return (
    <div className="container py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Access Control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage staff members and user permissions
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <AddUserDialog onSuccess={fetchUsers} />
            <CreateStaffDialog onSuccess={fetchUsers} />
          </div>
        )}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            All Users ({users.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          {selectedUsers.length > 0 && (
            <BulkActions
              selectedUsers={selectedUsers}
              onRefresh={fetchUsers}
              onClearSelection={() => setRowSelection({})}
            />
          )}

          <DataTable
            columns={getColumns(fetchUsers)}
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