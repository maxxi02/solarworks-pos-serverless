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
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";

interface CreateStaffDialogProps {
    onSuccess: () => Promise<void>;
}

export function CreateStaffDialog({ onSuccess }: CreateStaffDialogProps) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!email.trim()) return toast.error("Email is required");

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return toast.error("Please enter a valid email address");
        }

        setLoading(true);
        try {
            // Generate a secure random password
            const randomPassword = Math.random().toString(36).slice(-12) +
                Math.random().toString(36).toUpperCase().slice(-4);

            const { data: user, error } = await authClient.admin.createUser({
                email: email.trim(),
                name: name.trim(),
                password: randomPassword,
            });

            if (error) throw error;

            // Set role to "staff"
            if (user?.user?.id) {
                await authClient.admin.updateUser({
                    userId: user.user.id,
                    data: { customData: { role: "staff" } },
                });
            }

            toast.success(
                `Staff member "${email}" created successfully. A temporary password has been generated.`,
                { duration: 5000 }
            );

            resetForm();
            setOpen(false);
            await onSuccess();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to create staff member";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEmail("");
        setName("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <IconPlus className="size-4 mr-2" />
                    Create New Staff
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Staff Member</DialogTitle>
                    <DialogDescription>
                        Add a new staff member to your organization. The user will receive a temporary password.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="staff-email" className="required">
                            Email Address
                        </Label>
                        <Input
                            id="staff-email"
                            type="email"
                            placeholder="staff@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="focus-visible:ring-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="staff-name">Full Name</Label>
                        <Input
                            id="staff-name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Optional - can be added later
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Role Assignment</Label>
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                            <Badge variant="secondary" className="px-3 py-1">
                                Staff
                            </Badge>
                            <div className="flex-1">
                                <p className="text-sm font-medium">Staff Permissions</p>
                                <p className="text-xs text-muted-foreground">
                                    Can access staff dashboard and manage limited resources
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Role is automatically set to "Staff" for new staff members
                        </p>
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
                        className="min-w-[120px]"
                    >
                        {loading ? (
                            <>
                                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Creating...
                            </>
                        ) : (
                            "Create Staff"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}