import React from "react";
import { IconShield, IconUserCheck, IconUserX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "../staffManagement.types";

interface RoleBadgeProps {
    role?: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
    const variantMap: Record<UserRole | "user", "destructive" | "default" | "secondary" | "outline"> = {
        admin: "destructive",
        manager: "default",
        staff: "secondary",
        user: "outline",           // ← added this (or "secondary", "default", whatever fits "default/unknown user")
    };

    const icons: Record<UserRole | "user", React.ReactNode> = {
        admin: <IconShield className="size-3" />,
        manager: <IconUserCheck className="size-3" />,
        staff: <IconUserX className="size-3" />,
        user: null,                // already good
    };

    const display = role ?? "user";

    return (
        <Badge
            variant={variantMap[display]}  // now always defined
            className="gap-1.5 capitalize"
        >
            {icons[display]}
            {display}
        </Badge>
    );
}