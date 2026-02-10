"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { UserRole } from "../staffManagement.types"; 

interface AddUserDialogProps {
    onSuccess: () => Promise<void>;
}

export function AddUserDialog({ onSuccess }: AddUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<UserRole>("user");
    const [loading, setLoading] = useState(false);

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
            resetForm();
            await onSuccess();
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to create user";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEmail("");
        setName("");
        setRole("user");
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