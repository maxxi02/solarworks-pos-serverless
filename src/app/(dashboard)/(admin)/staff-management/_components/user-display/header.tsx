import { CreateStaffDialog } from "./create-staff-dialog";

interface HeaderProps {
    isAdmin: boolean;
    onRefresh: () => Promise<void>;
}

export function Header({ isAdmin, onRefresh }: HeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight">Access Control</h1>
                <p className="text-muted-foreground mt-2">
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