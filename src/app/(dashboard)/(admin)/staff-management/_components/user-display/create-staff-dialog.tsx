"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { IconPlus } from "@tabler/icons-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/types/role.type";


interface CreateStaffDialogProps {
    onSuccess: () => Promise<void>;
}

export function CreateStaffDialog({ onSuccess }: CreateStaffDialogProps) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("staff");
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!email.trim()) return toast.error("Email is required");
        if (!password.trim()) return toast.error("Password is required");
        if (password.length < 8) return toast.error("Password must be at least 8 characters");

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return toast.error("Please enter a valid email address");
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/create-user-with-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    name: name.trim() || undefined,
                    password,
                    role,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create user");
            }

            toast.success(
                `User "${email}" created successfully. They can login immediately with the temporary password: ${password}`,
                { duration: 10000 }
            );

            resetForm();
            setOpen(false);
            await onSuccess();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to create user";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEmail("");
        setName("");
        setPassword("");
        setRole("staff");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <IconPlus className="size-4 mr-2" />
                    Add User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                        Create a new user account. They will be able to log in immediately with a temporary password.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="user-email" className="required">
                            Email Address
                        </Label>
                        <Input
                            id="user-email"
                            type="email"
                            placeholder="user@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="focus-visible:ring-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user-name">Full Name</Label>
                        <Input
                            id="user-name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Optional - can be added later
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user-password" title="required" className="text-foreground required">Password</Label>
                        <Input
                            id="user-password"
                            type="password"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Minimum 8 characters
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user-role">Role</Label>
                        <Input
                            id="user-role"
                            value="Staff"
                            readOnly
                            disabled
                            className="bg-muted"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => {
                            resetForm();
                            setOpen(false);
                        }}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={loading || !email.trim()}
                        className="min-w-30"
                    >
                        {loading ? (
                            <>
                                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Creating...
                            </>
                        ) : (
                            "Create User"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}