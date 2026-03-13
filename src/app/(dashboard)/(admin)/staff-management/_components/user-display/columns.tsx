import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { IconDotsVertical } from "@tabler/icons-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { TableUser } from "../staffManagement.types";
import { RoleBadge } from "./role-badge";
import { StatusBadge } from "./status-badge";
import { OnlineStatusBadge } from "./online-status-badge";
import { UserEditDrawer } from "./user-edit-drawer";
import { DeleteUserDialog } from "./delete-user-dialog";
import { DragHandle } from "@/components/data-table";

interface GetColumnsProps {
    onRefresh: () => Promise<void>;
}

export function getColumns({ onRefresh }: GetColumnsProps): ColumnDef<TableUser>[] {
    return [
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
            size: 200,
        },
        { accessorKey: "email", header: "Email", size: 250 },
        {
            id: "role",
            header: "Role",
            cell: ({ row }) => <RoleBadge role={row.original.role} />,
            size: 120,
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
            size: 140,
        },
        // ── Pay Range column removed ───────────────────────────────────────
        {
            id: "status",
            header: "Account",
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            size: 120,
        },
        {
            id: "joined",
            header: () => <div className="text-right pr-4">Joined</div>,
            cell: ({ row }) =>
                <div className="text-right pr-4 text-muted-foreground">
                    {formatDistanceToNow(new Date(row.original.createdAt), {
                        addSuffix: true,
                    })}
                </div>,
            size: 180,
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
}