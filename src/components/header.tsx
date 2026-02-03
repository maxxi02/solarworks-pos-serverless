'use client';

import { usePathname } from 'next/navigation';
import { 
  Package, ShoppingCart, Users, UserCog, BarChart3, Settings, 
  Bell, Receipt, LayoutDashboard, PlusCircle, Edit, FolderTree, 
  AlertTriangle, FileText, CreditCard, Mail, Key, Activity,
  Home
} from 'lucide-react';

// Define page titles and icons based on routes
const pageConfig: Record<string, { title: string; icon: React.ComponentType<any> }> = {
  // Dashboard
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  
  // Sales
  '/sales': { title: 'Sales', icon: ShoppingCart },
  '/sales/transactions': { title: 'Transactions', icon: Receipt },
  '/sales/analytics': { title: 'Sales Analytics', icon: BarChart3 },
  '/sales/refunds': { title: 'Refunds & Returns', icon: ShoppingCart },
  
  // POS
  '/pos': { title: 'Point of Sale', icon: ShoppingCart },
  
  // Inventory
  '/inventory': { title: 'Inventory', icon: Package },
  '/inventory/products': { title: 'Products', icon: Package },
  '/inventory/add': { title: 'Add Product', icon: PlusCircle },
  '/inventory/edit/[id]': { title: 'Edit Product', icon: Edit },
  '/inventory/categories': { title: 'Categories', icon: FolderTree },
  '/inventory/alerts': { title: 'Stock Alerts', icon: AlertTriangle },
  '/inventory/reports': { title: 'Inventory Reports', icon: FileText },
  '/inventory/stock': { title: 'Stock Levels', icon: Package },
  
  // Customers
  '/customers': { title: 'Customers', icon: Users },
  '/customers/list': { title: 'Customer List', icon: Users },
  '/customers/add': { title: 'Add Customer', icon: PlusCircle },
  '/customers/analytics': { title: 'Customer Analytics', icon: BarChart3 },
  
  // Staff Management
  '/staff': { title: 'Staff Management', icon: UserCog },
  '/staff/list': { title: 'Staff List', icon: Users },
  '/staff/add': { title: 'Add Staff', icon: PlusCircle },
  '/staff/access': { title: 'Access Control', icon: Settings },
  
  // My Sales (Staff)
  '/my-sales': { title: 'My Sales', icon: Receipt },
  '/my-sales/history': { title: 'Transaction History', icon: Receipt },
  
  // Reports
  '/reports': { title: 'Reports & Analytics', icon: BarChart3 },
  '/reports/financial': { title: 'Financial Reports', icon: BarChart3 },
  '/reports/inventory': { title: 'Inventory Reports', icon: BarChart3 },
  '/reports/custom': { title: 'Custom Reports', icon: FileText },
  
  // Settings
  '/settings': { title: 'Settings', icon: Settings },
  '/settings/store': { title: 'Store Settings', icon: Settings },
  '/settings/receipt': { title: 'Receipt Settings', icon: Receipt },
  '/settings/payment': { title: 'Payment Methods', icon: CreditCard },
  '/settings/notifications': { title: 'Notifications', icon: Bell },
  '/settings/profile': { title: 'Profile', icon: UserCog },
  
  // Profile (Staff)
  '/profile': { title: 'Profile', icon: UserCog },
  '/profile/info': { title: 'Personal Info', icon: UserCog },
  '/profile/password': { title: 'Change Password', icon: Key },
  '/profile/activity': { title: 'Activity Log', icon: Activity },
  
  // Notifications
  '/notifications': { title: 'Notifications', icon: Bell },
};

// Function to find the best matching route
const getPageInfo = (pathname: string) => {
  // Try exact match first
  if (pageConfig[pathname]) {
    return pageConfig[pathname];
  }
  
  // Handle dynamic routes like /inventory/edit/[id]
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Check for dynamic routes with [param]
  for (const [route, config] of Object.entries(pageConfig)) {
    if (route.includes('[')) {
      const routeParts = route.split('/').filter(Boolean);
      if (routeParts.length === pathParts.length) {
        let matches = true;
        for (let j = 0; j < routeParts.length; j++) {
          if (!routeParts[j].startsWith('[') && routeParts[j] !== pathParts[j]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          return config;
        }
      }
    }
  }
  
  // Check for partial matches (parent routes)
  for (let i = pathParts.length; i > 0; i--) {
    const testPath = '/' + pathParts.slice(0, i).join('/');
    if (pageConfig[testPath]) {
      return pageConfig[testPath];
    }
  }
  
  // Default fallback
  return { title: 'Dashboard', icon: LayoutDashboard };
};

export default function Header() {
  const pathname = usePathname();
  const pageInfo = getPageInfo(pathname);
  const IconComponent = pageInfo.icon;
  
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <IconComponent className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">RENDEZVOUS CAFÉ</h1>
            <p className="text-sm text-muted-foreground">{pageInfo.title}</p>
          </div>
        </div>
      </div>
    </div>
  );
}