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
  Bell,
  Receipt,
  FolderOpen,
} from "lucide-react";

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
        url: "/sales/transactions",
      },
      {
        title: "Sales Analytics",
        url: "/sales/analytics",
      },
      {
        title: "Refunds & Returns",
        url: "/sales/refunds",
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
        url: "/inventory/products",
      },
      {
        title: "Add Product",
        url: "/inventory/add",
      },
      {
        title: "Categories",
        url: "/inventory/categories",
      },
      {
        title: "Stock Alerts",
        url: "/inventory/alerts",
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
        url: "/customers/list",
      },
      {
        title: "Add Customer",
        url: "/customers/add",
      },
      {
        title: "Analytics",
        url: "/customers/analytics",
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
        url: "/staff/list",
      },
      {
        title: "Add Staff",
        url: "/staff/add",
      },
      {
        title: "Access Control",
        url: "/staff/access",
      },
      {
        title: "Performance",
        url: "/staff/performance",
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
        url: "/reports/financial",
      },
      {
        title: "Inventory Reports",
        url: "/reports/inventory",
      },
      {
        title: "Custom Reports",
        url: "/reports/custom",
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
        url: "/settings/store",
      },
      {
        title: "Receipt Settings",
        url: "/settings/receipt",
      },
      {
        title: "Payment Methods",
        url: "/settings/payment",
      },
      {
        title: "Notifications",
        url: "/settings/notifications",
      },
      {
        title: "Profile",
        url: "/settings/profile",
      },
    ],
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
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
        url: "/inventory/products",
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
  // For demonstration, using admin navigation
  // Replace this with your actual role logic if needed
  const role = "admin"; // or "staff" - you can get this from props or context
  const navigationItems = role === "admin" ? adminNavigation : staffNavigation;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={[storeData]} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}