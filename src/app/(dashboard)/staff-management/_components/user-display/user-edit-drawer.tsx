"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth-client";
import { TableUser, UserRole } from "../staffManagement.types";

interface UserEditDrawerProps {
    user: TableUser;
    onRefresh: () => Promise<void>;
}

export function UserEditDrawer({ user, onRefresh }: UserEditDrawerProps) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(user.name ?? "");
    const [role, setRole] = useState<UserRole>(user.role ?? "staff");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const promises = [];

            // Name and role change via updateUser (stores role in metadata/custom field)
            if (name.trim() !== (user.name ?? "") || role !== user.role) {
                promises.push(
                    authClient.admin.updateUser({
                        userId: user.id,
                        data: {
                            name: name.trim() || null,
                            role: role, // Store custom role in user data
                        },
                    })
                );
            }

            await Promise.all(promises);
            toast.success("User updated successfully");
            setOpen(false);
            await onRefresh();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update user");
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
                <Button variant="link" className="px-0 hover:no-underline">
                    {user.name || user.email.split("@")[0]}
                </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-screen">
                <DrawerHeader className="border-b">
                    <DrawerTitle>Edit User</DrawerTitle>
                </DrawerHeader>

                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <Label htmlFor="user-email">Email</Label>
                        <Input
                            id="user-email"
                            value={user.email}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            Email cannot be changed
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user-name">Name</Label>
                        <Input
                            id="user-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter user's name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user-role">Role</Label>
                        <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                            <SelectTrigger id="user-role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="staff">Staff</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Staff: Basic access • Manager: Enhanced permissions • Admin: Full access
                        </p>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        <Label className="text-muted-foreground">Account Information</Label>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-medium">Status</p>
                                <p className="text-muted-foreground capitalize">
                                    {user.status}
                                </p>
                            </div>
                            <div>
                                <p className="font-medium">Joined</p>
                                <p className="text-muted-foreground">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            {user.emailVerified !== undefined && (
                                <div>
                                    <p className="font-medium">Email Verified</p>
                                    <p className="text-muted-foreground">
                                        {user.emailVerified ? "Yes" : "No"}
                                    </p>
                                </div>
                            )}
                            {user.phoneNumber && (
                                <div>
                                    <p className="font-medium">Phone</p>
                                    <p className="text-muted-foreground">
                                        {user.phoneNumber}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DrawerFooter className="border-t pt-4">
                    <div className="flex gap-3">
                        <Button onClick={handleSave} disabled={saving} className="flex-1">
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" className="flex-1">
                                Cancel
                            </Button>
                        </DrawerClose>
                    </div>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}