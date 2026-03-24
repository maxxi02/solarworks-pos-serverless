// src/constants/navigation.ts

import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  LucideIcon,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
  Image as ImageIcon,
} from "lucide-react";

export const PATHS = {
  DASHBOARD: "/dashboard",
  INVENTORY: "/inventory",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  MESSAGES: "/messages",
  STORIES: "/stories",

  ADMIN: {
    SALES: "/sales",
    SALES_ALL_TRANSACTIONS: "/sales/all-transactions",
    SALES_ANALYTICS: "/sales/sales-analytics",
    SALES_REFUND_REPORTS: "/sales/refund-reports",

    INVENTORY_CATEGORIES: "/inventory/categories",
    INVENTORY_STOCK_ALERT: "/inventory/stockalert",

    CUSTOMERS: "/customers",
    CUSTOMER_LIST: "/customer/customer-list",
    CUSTOMER_ANALYTICS: "/customer/analytics",

    STAFF: "/staff",
    STAFF_ACCESS_CONTROL: "/staff-management",
    STAFF_ATTENDANCE: "/staff-attendance",

    REPORTS: "/reports",
    REPORTS_FINANCIAL: "/reports-and-analytics/financial-reports",
    REPORTS_INVENTORY: "/reports-and-analytics/inventory-reports",
    REPORTS_CUSTOMER: "/reports-and-analytics/custom-reports",

    SETTINGS_RECEIPT: "/settings/receipt-setting",
    SETTINGS_PROFILE: "/settings/profile",
    SETTINGS_CUSTOMER_PORTAL: "/settings/customer-portal-settings",
  },

  STAFF_NAV: {
    ORDERS: "/orders",
    MY_SALES: "/my-sales",
    MY_SALES_HISTORY: "/transactionhistory",
    MY_SALES_PERFORMANCE: "/performance",
    CASH_MANAGEMENT: "/mysales/cash-management",
    CLOSE_REGISTER: "/mysales/close-register",

    INVENTORY_VIEW_PRODUCTS: "/inventory/product",
    INVENTORY_STOCK_LEVELS: "/inventory/stock",

    SETTINGS_PROFILE: "/settings/profile",
    ATTENDANCE: "/attendance",
    TABLES: "/staff-tables",
  },
} as const;

export type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavItem[];
};

export const adminNavigation: NavItem[] = [
  {
    title: "Dashboard",
    url: PATHS.DASHBOARD,
    icon: LayoutDashboard,
    isActive: true,
  },
  { title: "Messages", url: PATHS.MESSAGES, icon: MessageSquare },
  { title: "Stories", url: PATHS.STORIES, icon: ImageIcon },
  {
    title: "Sales",
    url: PATHS.ADMIN.SALES,
    icon: ShoppingCart,
    items: [
      { title: "All Transactions", url: PATHS.ADMIN.SALES_ALL_TRANSACTIONS },
      { title: "Sales Analytics", url: PATHS.ADMIN.SALES_ANALYTICS },
      { title: "Refund Reports", url: PATHS.ADMIN.SALES_REFUND_REPORTS },
    ],
  },
  {
    title: "Tables",
    url: "/tables",
    icon: LayoutDashboard, // Will use an appropriate icon like LayoutGrid or similar, let's just use LayoutDashboard since it's an existing import or add another one if needed. Oh, I can import QrCode or similar. Let's use LayoutDashboard for now since it's already imported. Wait, I can import Table from lucide-react if I want, but I'll stick to what's imported.
  },
  {
    title: "Inventory",
    url: PATHS.INVENTORY,
    icon: Package,
    items: [
      { title: "Categories", url: PATHS.ADMIN.INVENTORY_CATEGORIES },
      { title: "Stock Alerts", url: PATHS.ADMIN.INVENTORY_STOCK_ALERT },
    ],
  },
  {
    title: "Customers",
    url: PATHS.ADMIN.CUSTOMERS,
    icon: Users,
    items: [
      { title: "Customer List", url: PATHS.ADMIN.CUSTOMER_LIST },
      { title: "Analytics", url: PATHS.ADMIN.CUSTOMER_ANALYTICS },
    ],
  },
  {
    title: "Staff Management",
    url: PATHS.ADMIN.STAFF,
    icon: UserCog,
    items: [
      { title: "Manage Staff", url: PATHS.ADMIN.STAFF_ACCESS_CONTROL },
      { title: "Staff Attendance", url: PATHS.ADMIN.STAFF_ATTENDANCE },
    ],
  },
  {
    title: "Reports & Analytics",
    url: PATHS.ADMIN.REPORTS,
    icon: BarChart3,
    items: [
      { title: "Financial Reports", url: PATHS.ADMIN.REPORTS_FINANCIAL },
      { title: "Inventory Reports", url: PATHS.ADMIN.REPORTS_INVENTORY },
      { title: "Customer Reports", url: PATHS.ADMIN.REPORTS_CUSTOMER },
    ],
  },
  {
    title: "Settings",
    url: PATHS.SETTINGS,
    icon: Settings,
    items: [
      { title: "Receipt Settings", url: PATHS.ADMIN.SETTINGS_RECEIPT },
      { title: "Profile", url: PATHS.ADMIN.SETTINGS_PROFILE },
      {
        title: "Customer Portal Settings",
        url: PATHS.ADMIN.SETTINGS_CUSTOMER_PORTAL,
      },
    ],
  },
];

export const staffNavigation: NavItem[] = [
  {
    title: "Dashboard",
    url: PATHS.DASHBOARD,
    icon: LayoutDashboard,
    isActive: true,
  },
  { title: "Messages", url: PATHS.MESSAGES, icon: MessageSquare },
  { title: "Stories", url: PATHS.STORIES, icon: ImageIcon },
  { title: "Orders", url: PATHS.STAFF_NAV.ORDERS, icon: ShoppingCart },
  {
    title: "Tables",
    url: PATHS.STAFF_NAV.TABLES,
    icon: LayoutDashboard,
  },
  {
    title: "My Sales",
    url: PATHS.STAFF_NAV.MY_SALES,
    icon: Receipt,
    items: [
      { title: "Transaction History", url: PATHS.STAFF_NAV.MY_SALES_HISTORY },
      { title: "My Performance", url: PATHS.STAFF_NAV.MY_SALES_PERFORMANCE },
      { title: "Cash Management", url: PATHS.STAFF_NAV.CASH_MANAGEMENT },
      { title: "Close Register", url: PATHS.STAFF_NAV.CLOSE_REGISTER },
    ],
  },
  {
    title: "Inventory",
    url: PATHS.INVENTORY,
    icon: Package,
    items: [
      { title: "View Products", url: PATHS.STAFF_NAV.INVENTORY_VIEW_PRODUCTS },
      { title: "Stock Levels", url: PATHS.STAFF_NAV.INVENTORY_STOCK_LEVELS },
    ],
  },
  {
    title: "Attendance",
    url: PATHS.STAFF_NAV.ATTENDANCE,
    icon: ClipboardCheck,
  },
  {
    title: "Settings",
    url: PATHS.SETTINGS,
    icon: Settings,
    items: [{ title: "Profile", url: PATHS.STAFF_NAV.SETTINGS_PROFILE }],
  },
];
