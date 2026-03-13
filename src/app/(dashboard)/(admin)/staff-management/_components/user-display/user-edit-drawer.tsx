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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth-client";
import { TableUser, UserRole } from "../staffManagement.types";
import {
    IconMail,
    IconPhone,
    IconShieldCheck,
    IconShieldX,
    IconCalendar,
    IconKey,
    IconUser,
    IconClock,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";

interface UserEditDrawerProps {
    user: TableUser;
    onRefresh: () => Promise<void>;
}

function getInitials(name: string | null, email: string): string {
    if (name) {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
}

export function UserEditDrawer({ user, onRefresh }: UserEditDrawerProps) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(user.name ?? "");
    const [role, setRole] = useState<UserRole>(user.role ?? "staff");
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const promises = [];

            if (name.trim() !== (user.name ?? "") || role !== user.role) {
                promises.push(
                    authClient.admin.updateUser({
                        userId: user.id,
                        data: {
                            name: name.trim() || null,
                            role: role,
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

    const handleResetPassword = async () => {
        setResetting(true);
        try {
            await authClient.requestPasswordReset({
                email: user.email,
                redirectTo: "/reset-password",
            });
            toast.success(
                `Password reset email sent to ${user.email}`,
                { description: "The staff member will receive instructions to reset their password." }
            );
        } catch (err) {
            console.error(err);
            toast.error("Failed to send password reset email");
        } finally {
            setResetting(false);
        }
    };

    const statusColors: Record<TableUser["status"], string> = {
        active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
        banned: "bg-red-500/15 text-red-600 border-red-500/30",
        inactive: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    };

    return (
        <Drawer
            open={open}
            onOpenChange={setOpen}
            direction={isMobile ? "bottom" : "right"}
        >
            <DrawerTrigger asChild>
                <Button variant="link" className="px-0 hover:no-underline font-medium">
                    {user.name || user.email.split("@")[0]}
                </Button>
            </DrawerTrigger>

            <DrawerContent className="max-h-screen flex flex-col">
                <DrawerHeader className="border-b pb-4">
                    <DrawerTitle>Staff Details</DrawerTitle>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto">
                    {/* ── Profile Header ── */}
                    <div className="p-6 flex flex-col items-center gap-3 bg-muted/30 border-b">
                        <Avatar className="size-20 ring-2 ring-border">
                            <AvatarImage
                                src={user.image ?? undefined}
                                alt={user.name ?? user.email}
                            />
                            <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                                {getInitials(user.name, user.email)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="text-center space-y-1">
                            <p className="font-semibold text-lg leading-tight">
                                {user.name || user.email.split("@")[0]}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex items-center justify-center gap-2 pt-1">
                                <Badge variant="outline" className={statusColors[user.status]}>
                                    {user.status}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                    {user.role}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* ── Account Info ── */}
                        <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Account Info
                            </p>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-3">
                                    <IconMail className="size-4 text-muted-foreground shrink-0" />
                                    <span className="truncate">{user.email}</span>
                                    {user.emailVerified ? (
                                        <IconShieldCheck className="size-4 text-emerald-500 ml-auto shrink-0" title="Email verified" />
                                    ) : (
                                        <IconShieldX className="size-4 text-yellow-500 ml-auto shrink-0" title="Email not verified" />
                                    )}
                                </div>

                                {user.phoneNumber && (
                                    <div className="flex items-center gap-3">
                                        <IconPhone className="size-4 text-muted-foreground shrink-0" />
                                        <span>{user.phoneNumber}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <IconCalendar className="size-4 text-muted-foreground shrink-0" />
                                    <span>
                                        Joined {new Date(user.createdAt).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </span>
                                </div>

                                {user.lastActive && (
                                    <div className="flex items-center gap-3">
                                        <IconClock className="size-4 text-muted-foreground shrink-0" />
                                        <span>
                                            Last active{" "}
                                            {formatDistanceToNow(new Date(user.lastActive), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                    </div>
                                )}

                                {user.isOnline && (
                                    <div className="flex items-center gap-3">
                                        <span className="size-2 rounded-full bg-emerald-500 ml-1 shrink-0" />
                                        <span className="text-emerald-600 font-medium">Currently online</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* ── Edit Fields ── */}
                        <div className="space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Edit Details
                            </p>

                            <div className="space-y-2">
                                <Label htmlFor="user-name" className="flex items-center gap-2">
                                    <IconUser className="size-4" /> Name
                                </Label>
                                <Input
                                    id="user-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter staff name"
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
                        </div>

                        <Separator />

                        {/* ── Password Reset ── */}
                        <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Security
                            </p>
                            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                                <div className="flex items-start gap-3">
                                    <IconKey className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Reset Password</p>
                                        <p className="text-xs text-muted-foreground">
                                            Send a password reset link to{" "}
                                            <span className="font-medium text-foreground">{user.email}</span>.
                                            The staff member will receive an email with instructions.
                                        </p>
                                    </div>
                                </div>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={resetting}
                                            className="w-full"
                                        >
                                            <IconKey className="size-4 mr-2" />
                                            {resetting ? "Sending Reset Email..." : "Send Password Reset Email"}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Reset Password?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will send a password reset email to{" "}
                                                <span className="font-semibold text-foreground">
                                                    {user.email}
                                                </span>
                                                . The link will allow them to set a new password.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleResetPassword}>
                                                Send Reset Email
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
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