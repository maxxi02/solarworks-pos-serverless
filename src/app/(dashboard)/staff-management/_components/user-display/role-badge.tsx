import React from "react";
import { IconShield, IconUserCheck, IconUserX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "../staffManagement.types";

interface RoleBadgeProps {
    role?: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
    const variantMap: Record<UserRole, "destructive" | "default" | "secondary" | "outline"> = {
        admin: "destructive",
        manager: "default",
        staff: "secondary",
        user: "outline",
    };

    const icons: Record<string, React.ReactNode> = {
        admin: <IconShield className="size-3" />,
        manager: <IconUserCheck className="size-3" />,
        staff: <IconUserX className="size-3" />,
        user: null,
    };

    const display = role ?? "user";

    return (
        <Badge
            variant={variantMap[display] ?? "outline"}
            className="gap-1.5 capitalize"
        >
            {icons[display]}
            {display}
        </Badge>
    );
}