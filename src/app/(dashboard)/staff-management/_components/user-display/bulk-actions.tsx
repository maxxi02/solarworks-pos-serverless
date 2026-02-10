"use client";

import React, { useState } from "react";
import { toast } from "sonner";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { TableUser, UserRole } from "../staffManagement.types";

interface BulkActionsProps {
    selectedUsers: TableUser[];
    onRefresh: () => Promise<void>;
    onClearSelection: () => void;
}

export function BulkActions({
    selectedUsers,
    onRefresh,
    onClearSelection,
}: BulkActionsProps) {
    const [roleOpen, setRoleOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [newRole, setNewRole] = useState<UserRole>("user");
    const [loading, setLoading] = useState(false);

    const handleRoleChange = async () => {
        setLoading(true);
        try {
            await Promise.all(
                selectedUsers.map((user) =>
                    authClient.admin.updateUser({
                        userId: user.id,
                        data: { customData: { role: newRole } },
                    })
                )
            );

            toast.success(
                `Updated role to "${newRole}" for ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`
            );
            setRoleOpen(false);
            onClearSelection();
            await onRefresh();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to update roles";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setLoading(true);
        try {
            await Promise.all(
                selectedUsers.map((user) =>
                    authClient.admin.removeUser({ userId: user.id })
                )
            );

            toast.success(
                `Deleted ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} successfully`
            );
            setDeleteOpen(false);
            onClearSelection();
            await onRefresh();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete users";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const getSelectedUsersSummary = () => {
        const roles = selectedUsers.reduce((acc: Record<string, number>, user) => {
            const role = user.role || 'user';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(roles)
            .map(([role, count]) => `${count} ${role}${count > 1 ? 's' : ''}`)
            .join(", ");
    };

    return (
        <div className="bg-linear-to-r from-muted/50 to-muted/30 p-4 rounded-lg border mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <p className="font-medium">
                        {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                    </p>
                    {selectedUsers.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                            Includes: {getSelectedUsersSummary()}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {/* Change Role Dialog */}
                    <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={loading}
                            >
                                Change Role
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-106.25">
                            <DialogHeader>
                                <DialogTitle>Change Role for {selectedUsers.length} Users</DialogTitle>
                                <DialogDescription>
                                    Select a new role for all selected users.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">New Role</label>
                                    <Select
                                        value={newRole}
                                        onValueChange={(value) => setNewRole(value as UserRole)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="manager">Manager</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="rounded-lg border p-3 bg-muted/30">
                                    <p className="text-sm font-medium mb-2">Affected Users:</p>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {selectedUsers.slice(0, 10).map((user) => (
                                            <div key={user.id} className="flex items-center justify-between text-sm">
                                                <span className="truncate">{user.name || user.email.split('@')[0]}</span>
                                                <span className="text-muted-foreground text-xs capitalize">
                                                    {user.role} → {newRole}
                                                </span>
                                            </div>
                                        ))}
                                        {selectedUsers.length > 10 && (
                                            <p className="text-xs text-muted-foreground pt-2">
                                                ...and {selectedUsers.length - 10} more
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setRoleOpen(false)}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleRoleChange}
                                    disabled={loading}
                                    className="min-w-[100px]"
                                >
                                    {loading ? (
                                        <>
                                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Update Roles"
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Bulk Delete Alert Dialog */}
                    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="sm"
                                variant="destructive"
                                disabled={loading}
                            >
                                Delete Selected
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete {selectedUsers.length} Users?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete{" "}
                                    <span className="font-semibold text-foreground">
                                        {selectedUsers.length} user account{selectedUsers.length > 1 ? 's' : ''}
                                    </span>
                                    {" "}and remove all associated data.
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            <div className="rounded-lg border bg-destructive/5 p-3 my-2">
                                <p className="text-sm font-medium mb-2">Users to be deleted:</p>
                                <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                                    {selectedUsers.slice(0, 15).map((user) => (
                                        <div key={user.id} className="flex items-center justify-between py-1">
                                            <span className="truncate">{user.name || user.email.split('@')[0]}</span>
                                            <span className="text-muted-foreground text-xs">{user.email}</span>
                                        </div>
                                    ))}
                                    {selectedUsers.length > 15 && (
                                        <p className="text-xs text-muted-foreground pt-2">
                                            ...and {selectedUsers.length - 15} more
                                        </p>
                                    )}
                                </div>
                            </div>

                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={loading}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleBulkDelete}
                                    disabled={loading}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {loading ? "Deleting..." : `Delete ${selectedUsers.length} Users`}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Clear Selection */}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClearSelection}
                        disabled={loading}
                    >
                        Clear Selection
                    </Button>
                </div>
            </div>
        </div>
    );
}