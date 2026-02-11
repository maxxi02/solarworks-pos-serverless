import React from "react";
import { CreateStaffDialog } from "./create-staff-dialog";

interface HeaderProps {
    isAdmin: boolean;
    onRefresh: () => Promise<void>;
}

export function Header({ isAdmin, onRefresh }: HeaderProps) {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold">Access Control</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage staff members and user permissions
                </p>
            </div>
            {isAdmin && (
                <div className="flex gap-3">
                    <CreateStaffDialog onSuccess={onRefresh} />
                </div>
            )}
        </div>
    );
}