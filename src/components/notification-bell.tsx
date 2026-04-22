"use client";

import { useEffect, useState } from "react";
import { Bell, ShoppingBag, CheckCircle2 } from "lucide-react";
import { useSocket, CustomerOrder } from "@/provider/socket-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { PATHS } from "@/constants/navigation";

export function NotificationBell() {
  const { onNewCustomerOrder, offNewCustomerOrder } = useSocket();
  const [notifications, setNotifications] = useState<CustomerOrder[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleNewOrder = (order: CustomerOrder) => {
      setNotifications((prev) => [order, ...prev]);
    };

    onNewCustomerOrder(handleNewOrder);
    return () => {
      offNewCustomerOrder(handleNewOrder);
    };
  }, [onNewCustomerOrder, offNewCustomerOrder]);

  const unreadCount = notifications.length;

  const handleNotificationClick = (orderId: string) => {
    // Remove the clicked notification
    setNotifications((prev) => prev.filter((n) => n.orderId !== orderId));
    setOpen(false);

    // Route directly to Queue Board
    router.push(PATHS.STAFF_NAV.ORDERS);
  };

  const clearAll = () => {
    setNotifications([]);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-muted" 
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button 
              onClick={clearAll}
              className="text-xs text-primary hover:underline font-medium transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3">
              <div className="rounded-full bg-muted p-3">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">You're all caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((order, idx) => (
                <button
                  key={order.orderId || idx}
                  className="flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleNotificationClick(order.orderId)}
                >
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col flex-1 gap-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium leading-none truncate">New Portal Order</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {order.timestamp ? new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      <span className="font-medium text-foreground">
                        {order.customerName}
                      </span> placed an order (#{order.orderNumber || order.orderId?.substring(0, 8)}) for {order.orderType === "dine-in" ? "Dine In" : "Takeaway"}.
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {unreadCount > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <Button 
              variant="outline" 
              className="w-full text-xs h-8" 
              onClick={() => {
                setOpen(false);
                router.push(PATHS.STAFF_NAV.ORDERS);
              }}
            >
              View Queue Board
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
