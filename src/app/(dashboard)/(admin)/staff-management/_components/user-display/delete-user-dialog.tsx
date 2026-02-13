"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { IconTrash } from "@tabler/icons-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

interface DeleteUserDialogProps {
    userId: string;
    userName: string;
    onSuccess: () => Promise<void>;
}

export function DeleteUserDialog({
    userId,
    userName,
    onSuccess,
}: DeleteUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            const { error } = await authClient.admin.removeUser({ userId });
            if (error) throw error;
            toast.success(`User "${userName}" has been deleted`);
            await onSuccess();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete user";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    return (
        <>
            <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                    e.preventDefault();
                    setOpen(true);
                }}
            >
                <IconTrash className="size-4 mr-2" />
                Delete User
            </DropdownMenuItem>

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete{" "}
                            <span className="font-semibold text-foreground">
                                {userName}
                            </span>
                            's account and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={loading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {loading ? "Deleting..." : "Delete User"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}