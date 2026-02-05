'use client';

import * as React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  UserCog,
  BarChart3,
  Settings,
  Receipt,
  FolderOpen,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "./team-switcher";
import { NavMain } from "./nav-main";

// Import Better Auth hooks
import { useSession, signOut, getCurrentUserRole, getUserInitials } from "@/lib/auth-client";

// Store/Team data
const storeData = {
  name: "SolarWorks POS",
  logo: FolderOpen,
  plan: "Business",
};

// Navigation structures (keep the same arrays from your original code)
const adminNavigation = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Sales",
    url: "/sales",
    icon: ShoppingCart,
    items: [
      {
        title: "All Transactions",
        url: "/sales/all-transactions",
      },
      {
        title: "Sales Analytics",
        url: "/sales/sales-analytics",
      },
      {
        title: "Refunds & Returns",
        url: "/sales/refund-and-return",
      },
    ],
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
    items: [
      {
        title: "Products",
        url: "/inventory/product",
      },
      {
        title: "Add Product",
        url: "/inventory/addproduct",
      },
      {
        title: "Categories",
        url: "/inventory/categories",
      },
      {
        title: "Stock Alerts",
        url: "/inventory/stockalert",
      },
      {
        title: "Reports",
        url: "/inventory/reports",
      },
    ],
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
    items: [
      {
        title: "Customer List",
        url: "/customer/customer-list",
      },
      {
        title: "Analytics",
        url: "/customer/analytics",
      },
    ],
  },
  {
    title: "Staff Management",
    url: "/staff",
    icon: UserCog,
    items: [
      {
        title: "Staff List",
        url: "/staff-management/staff-list",
      },
      {
        title: "Add Staff",
        url: "/staff-management/add-staff",
      },
      {
        title: "Access Control",
        url: "/staff-management/access-control",
      },
    ],
  },
  {
    title: "Reports & Analytics",
    url: "/reports",
    icon: BarChart3,
    items: [
      {
        title: "Financial Reports",
        url: "/reports-and-analytics/financial-reports",
      },
      {
        title: "inventory-reports",
        url: "/reports-and-analytics/inventory-reports",
      },
      {
        title: "Customer Reports",
        url: "/reports-and-analytics/custom-reports",
      },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    items: [
      {
        title: "Store Settings",
        url: "/settings/store-setting",
      },
      {
        title: "Receipt Settings",
        url: "/settings/receipt-setting",
      },
      {
        title: "Payment Methods",
        url: "/settings/payments-methods",
      },
      {
        title: "Profile",
        url: "/settings/profile",
      },
    ],
  },
];

const staffNavigation = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Point of Sale",
    url: "/pos",
    icon: ShoppingCart,
  },
  {
    title: "My Sales",
    url: "/my-sales",
    icon: Receipt,
    items: [
      {
        title: "Transaction History",
        url: "/my-sales/history",
      },
      {
        title: "My Performance",
        url: "/my-sales/performance",
      },
    ],
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
    items: [
      {
        title: "View Products",
        url: "/src/inventory/product",
      },
      {
        title: "Stock Levels",
        url: "/inventory/stock",
      },
    ],
  },
  {
    title: "Profile",
    url: "/profile",
    icon: Settings,
    items: [
      {
        title: "Personal Info",
        url: "/profile/info",
      },
      {
        title: "Change Password",
        url: "/profile/password",
      },
      {
        title: "Activity Log",
        url: "/profile/activity",
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Use Better Auth's useSession hook - this is the main way to get user data
  const { data: session, isPending } = useSession();

  // Determine which navigation to show based on role
  const getUserRole = () => {
    if (!session?.user) return "staff";
    return getCurrentUserRole(session.user);
  };

  const navigationItems = getUserRole() === 'admin' ? adminNavigation : staffNavigation;

  // Logout function using Better Auth's signOut
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Sign out using Better Auth - this will clear the session cookie
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            console.log("Logged out successfully");
            // Redirect to home/login page
            router.push("/");
          },
          onError: (error) => {
            console.error("Logout error:", error);
            // Even if there's an error, redirect to home
            router.push("/");
          },
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Redirect to home even on error
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // User profile component for sidebar footer
  const UserProfileFooter = () => {
    if (isPending) {
      return (
        <div className="flex w-full items-center gap-3 rounded-lg p-2">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
          <div className="flex flex-col flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
            <div className="h-3 w-full bg-muted rounded animate-pulse"></div>
          </div>
        </div>
      );
    }

    if (!session?.user) {
      return null;
    }

    const user = session.user;
    const userRole = getCurrentUserRole(user);
    const userInitials = getUserInitials(user.name || undefined);

    return (
      <div className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors">
        {user.image ? (
          <img 
            src={user.image} 
            alt={user.name || "User"}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {userInitials}
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">
            {user.name || user.email?.split('@')[0] || "User"}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {user.email || ""}
          </span>
          <span className="text-xs text-primary capitalize">
            {userRole === 'admin' ? 'Administrator' : 'Staff'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="ml-auto rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Logout"
          aria-label="Logout"
        >
          {isLoggingOut ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  };

  // Loading state
  if (isPending) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <TeamSwitcher teams={[storeData]} />
        </SidebarHeader>
        <SidebarContent>
          <div className="space-y-2 px-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-muted animate-pulse"></div>
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter>
          <UserProfileFooter />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  }

  // If no session but not loading, don't show sidebar
  if (!session) {
    return null;
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={[storeData]} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationItems} />
      </SidebarContent>
      <SidebarFooter>
        <UserProfileFooter />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}