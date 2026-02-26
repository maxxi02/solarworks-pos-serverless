// src/constants/navigation.ts

import {
  BarChart3,
  LayoutDashboard,
  LucideIcon,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
} from "lucide-react";

export const PATHS = {
  DASHBOARD: "/dashboard",
  INVENTORY: "/inventory",
  PROFILE: "/profile",
  SETTINGS: "/settings",

  ADMIN: {
    SALES: "/sales",
    SALES_ALL_TRANSACTIONS: "/sales/all-transactions",
    SALES_ANALYTICS: "/sales/sales-analytics",
    SALES_REFUND_RETURN: "/sales/refund-and-return",
    SALES_CASH_MANAGEMENT: "/mysales/cash-management",
    SALES_CLOSE_REGISTER: "/mysales/close-register",

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
    REPORTS_CUSTOM: "/reports-and-analytics/custom-reports",

    SETTINGS_STORE: "/settings/store-setting",
    SETTINGS_RECEIPT: "/settings/receipt-setting",
    SETTINGS_PAYMENTS: "/settings/payments-methods",
    SETTINGS_PROFILE: "/settings/profile",
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
  { title: "Dashboard", url: PATHS.DASHBOARD, icon: LayoutDashboard, isActive: true },
  {
    title: "Sales",
    url: PATHS.ADMIN.SALES,
    icon: ShoppingCart,
    items: [
      { title: "All Transactions", url: PATHS.ADMIN.SALES_ALL_TRANSACTIONS },
      { title: "Cash Management", url: PATHS.ADMIN.SALES_CASH_MANAGEMENT },
      { title: "Close Register", url: PATHS.ADMIN.SALES_CLOSE_REGISTER },
      { title: "Sales Analytics", url: PATHS.ADMIN.SALES_ANALYTICS },
      { title: "Refunds & Returns", url: PATHS.ADMIN.SALES_REFUND_RETURN },
    ],
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
      { title: "Custom Reports", url: PATHS.ADMIN.REPORTS_CUSTOM },
    ],
  },
  {
    title: "Settings",
    url: PATHS.SETTINGS,
    icon: Settings,
    items: [
      { title: "Store Settings", url: PATHS.ADMIN.SETTINGS_STORE },
      { title: "Receipt Settings", url: PATHS.ADMIN.SETTINGS_RECEIPT },
      { title: "Payment Methods", url: PATHS.ADMIN.SETTINGS_PAYMENTS },
      { title: "Profile", url: PATHS.ADMIN.SETTINGS_PROFILE },
    ],
  },
];

export const staffNavigation: NavItem[] = [
  { title: "Dashboard", url: PATHS.DASHBOARD, icon: LayoutDashboard, isActive: true },
  { title: "Orders", url: PATHS.STAFF_NAV.ORDERS, icon: ShoppingCart },
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
    title: "Settings",
    url: PATHS.SETTINGS,
    icon: Settings,
    items: [{ title: "Profile", url: PATHS.STAFF_NAV.SETTINGS_PROFILE }],
  },
];