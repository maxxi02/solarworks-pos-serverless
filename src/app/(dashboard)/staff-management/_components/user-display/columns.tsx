import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { IconDotsVertical } from "@tabler/icons-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { TableUser } from "../staffManagement.types";
import { RoleBadge } from "../user-display/role-badge";
import { StatusBadge } from "./status-badge";
import { OnlineStatusBadge } from "../user-display/online-status-badge";
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
}