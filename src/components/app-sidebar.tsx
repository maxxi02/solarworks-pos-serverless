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
import { NavUser } from "./nav-user";

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

// Mock user data
const mockUsers = {
  admin: {
    name: "Admin User",
    email: "admin@solarworks.com",
    role: "admin",
    avatar: "AU",
    initials: "AU",
  },
  staff: {
    name: "John Doe",
    email: "john@solarworks.com",
    role: "staff",
    avatar: "JD",
    initials: "JD",
  },
  manager: {
    name: "Jane Smith",
    email: "jane@solarworks.com",
    role: "manager",
    avatar: "JS",
    initials: "JS",
  },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const [currentUser] = React.useState(mockUsers.admin);
  const navigationItems = currentUser.role === "admin" ? adminNavigation : staffNavigation;

  // Simple logout function that redirects to login page
  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem("solarworks_token");
    localStorage.removeItem("solarworks_user");
    sessionStorage.clear();
    
    // Redirect to login page
    router.push("/");
  };

  // Update NavUser component to include logout functionality
  const UpdatedNavUser = () => {
    return (
      <div className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-accent">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {currentUser.initials}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{currentUser.name}</span>
          <span className="text-xs text-muted-foreground">{currentUser.email}</span>
          <span className="text-xs text-primary capitalize">{currentUser.role}</span>
        </div>
        <button
          onClick={handleLogout}
          className="ml-auto rounded-md p-2 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
          title="Logout"
        >
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
        </button>
      </div>
    );
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={[storeData]} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationItems} />
      </SidebarContent>
      <SidebarFooter>
        <UpdatedNavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}