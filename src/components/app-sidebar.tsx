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

// Import your auth client
import { 
  getCurrentUser, 
  getCurrentUserRole, 
  getUserInitials, 
  signOut,
  useSession,
} from "@/lib/auth-client";

// Admin navigation structure
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

// Staff navigation structure
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

// Store/Team data
const storeData = {
  name: "SolarWorks POS",
  logo: FolderOpen,
  plan: "Business",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState<{
    name: string;
    email: string;
    role: 'admin' | 'staff';
    initials: string;
    avatar?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Use Better Auth's useSession hook - this is the recommended way
  const { data: session } = useSession();

  // Update user state when session changes
  React.useEffect(() => {
    if (session?.user) {
      const role = getCurrentUserRole(session.user);
      
      setCurrentUser({
        name: session.user.name || "User",
        email: session.user.email || "",
        role: role,
        initials: getUserInitials(session.user.name),
        avatar: session.user.image || undefined,
      });
      setIsLoading(false);
    } else if (session === null) {
      // No session - redirect to login
      setCurrentUser(null);
      setIsLoading(false);
      router.push('/');
    }
  }, [session, router]);

  // Alternative: Fetch user directly if useSession doesn't work
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const user = await getCurrentUser();
        
        if (user) {
          const role = getCurrentUserRole(user);
          
          setCurrentUser({
            name: user.name || "User",
            email: user.email || "",
            role: role,
            initials: getUserInitials(user.name),
            avatar: user.image || undefined,
          });
        } else {
          // No user found - redirect to login
          router.push('/');
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if useSession didn't provide a user
    if (!session && !currentUser) {
      fetchUser();
    }
  }, [session, currentUser, router]);

  // Logout function using Better Auth's signOut
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            setCurrentUser(null);
            router.push("/");
          },
          onError: (error) => {
            console.error("Logout error:", error);
            setCurrentUser(null);
            router.push("/");
          }
        }
      });
    } catch (error) {
      console.error("Logout error:", error);
      setCurrentUser(null);
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // User profile component for sidebar footer
  const UserProfileFooter = () => {
    if (!currentUser) return null;

    return (
      <div className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors">
        {currentUser.avatar ? (
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {currentUser.initials}
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{currentUser.name}</span>
          <span className="text-xs text-muted-foreground truncate">{currentUser.email}</span>
          <span className="text-xs text-primary capitalize">
            {currentUser.role === 'admin' ? 'Administrator' : 'Staff'}
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
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          )}
        </button>
      </div>
    );
  };

  // Loading skeleton
  if (isLoading) {
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
          <div className="flex w-full items-center gap-3 rounded-lg p-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
            <div className="flex flex-col flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
              <div className="h-3 w-full bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  }

  if (!currentUser) {
    return null;
  }

  // Determine which navigation to show based on role
  const navigationItems = currentUser.role === 'admin' ? adminNavigation : staffNavigation;

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