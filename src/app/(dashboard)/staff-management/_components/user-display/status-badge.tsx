import React from "react";
import { Badge } from "@/components/ui/badge";
import { TableUser } from "../staffManagement.types"; 

interface StatusBadgeProps {
    status: TableUser["status"];
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const variantMap: Record<TableUser["status"], "destructive" | "default" | "secondary"> = {
        active: "default",
        banned: "destructive",
        inactive: "secondary",
    };

    return (
        <Badge variant={variantMap[status]} className="capitalize">
            {status}
        </Badge>
    );
}