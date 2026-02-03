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
      {
        title: "Performance",
        url: "/staff-management/performance",
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
        title: "Custom Reports",
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