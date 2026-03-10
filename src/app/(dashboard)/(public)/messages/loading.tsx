import { Loader2 } from "lucide-react";

export default function MessagesLoading() {
    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden border rounded-lg bg-background">
            {/* Sidebar Skeleton */}
            <div className="w-80 border-r border-border bg-card flex-col hidden sm:flex">
                <div className="p-4 border-b border-border">
                    <div className="h-6 w-24 bg-muted rounded animate-pulse mb-3" />
                    <div className="h-8 w-full bg-muted rounded animate-pulse" />
                </div>
                <div className="p-3 space-y-4 flex-1 mt-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                                <div className="h-2.5 w-3/4 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Area Skeleton */}
            <div className="flex-1 flex flex-col bg-background">
                <div className="p-4 border-b border-border flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
                </div>
            </div>
        </div>
    );
}
