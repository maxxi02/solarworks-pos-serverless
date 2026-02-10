"use client";

import * as React from "react";
import Image from "next/image";
import { FolderOpen, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TeamSwitcher } from "./team-switcher";
import { NavMain } from "./nav-main";

import { authClient } from "@/lib/auth-client";
import { ExtendedUser } from "@/types/user.type";
import { UserRole } from "@/types/role.type";
import { adminNavigation, staffNavigation } from "@/constants/navigation";
import { socketClient } from "@/lib/socket-client";


const storeData = {
  name: "SolarWorks POS",
  logo: FolderOpen,
  plan: "Business",
};

interface SessionData {
  user: ExtendedUser | null;
}

const getUserRole = (user: ExtendedUser | null | undefined): UserRole => {
  return user?.role === "admin" ? "admin" : "user";
};

const getUserInitials = (name?: string | null): string => {
  if (!name) return "U";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

// ─── Online Status Indicator ─────────────────────────────────────
const OnlineStatusIndicator = () => {
  const [isOnline, setIsOnline] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);
  const activityTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setIsOnline(socketClient.isConnected());

    const handleActivity = () => {
      setIsActive(true);

      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      // Set to inactive after 2 minutes of no activity
      activityTimeoutRef.current = setTimeout(() => {
        setIsActive(false);
      }, 2 * 60 * 1000);
    };

    // Listen for socket connection changes
    const socket = socketClient.getSocket();
    if (socket) {
      socket.on("connect", () => setIsOnline(true));
      socket.on("disconnect", () => setIsOnline(false));
    }

    // Track user activity
    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("click", handleActivity, { passive: true });

    // Initial activity
    handleActivity();

    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
    };
  }, []);

  if (!isOnline) {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500/30" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
    );
  }

  if (!isActive) {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-gray-400/30" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gray-400" />
      </span>
    );
  }

  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
    </span>
  );
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession() as {
    data: SessionData | null;
    isPending: boolean;
  };

  const { state } = useSidebar();

  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const user = session?.user;
  const userRole = getUserRole(user);
  const navigationItems = userRole === "admin" ? adminNavigation : staffNavigation;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => router.push("/"),
          onError: () => router.push("/"),
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const UserProfileFooter = () => {
    if (isPending) {
      return (
        <div className="flex w-full items-center gap-3 rounded-lg p-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-1 flex-col space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      );
    }

    if (!user) return null;

    const initials = getUserInitials(user.name);

    return (
      <div className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent">
        <div className="relative">
          {user.image ? (
            <div className="relative h-8 w-8 shrink-0">
              <Image
                src={user.image}
                alt={user.name || "User avatar"}
                fill
                className="rounded-full object-cover"
                sizes="32px"
                priority
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {initials}
            </div>
          )}
          {/* Online Status Badge */}
          <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
            <OnlineStatusIndicator />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">
            {user.name || user.email?.split("@")[0] || "User"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email || ""}
          </span>
          <span className="capitalize text-xs text-primary">
            {userRole === "admin" ? "Administrator" : "Staff"}
          </span>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button
              disabled={isLoggingOut}
              className="ml-auto rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
              title="Logout"
              aria-label="Logout"
            >
              {isLoggingOut ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Logout?</DialogTitle>
              <DialogDescription>
                Are you sure you want to logout?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => { }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Yes, Logout"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  if (isPending) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <TeamSwitcher teams={[storeData]} />
        </SidebarHeader>
        <SidebarContent>
          <div className="space-y-2 px-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </SidebarContent>
        {state !== "collapsed" && (
          <SidebarFooter>
            <UserProfileFooter />
          </SidebarFooter>
        )}
        <SidebarRail />
      </Sidebar>
    );
  }

  if (!session?.user) return null;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={[storeData]} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationItems} />
      </SidebarContent>
      {state !== "collapsed" && (
        <SidebarFooter>
          <UserProfileFooter />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}