"use client";

import { useState } from "react";
import { History, Clock, Eye, Printer, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SavedOrder } from "./pos.types";
import { formatCurrency, formatDate } from "./pos.utils";

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SavedOrder[];
  onReprint: (order: SavedOrder) => void;
  onViewDetails: (order: SavedOrder) => void;
}

type DateRange = "today" | "week" | "month" | "all";

const getDateFilter = (range: DateRange): Date | null => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map: Record<DateRange, Date | null> = {
    today,
    week: new Date(today.getTime() - 7 * 86400000),
    month: new Date(today.getTime() - 30 * 86400000),
    all: null,
  };
  return map[range];
};

export const OrderHistoryModal = ({
  isOpen,
  onClose,
  orders,
  onReprint,
  onViewDetails,
}: OrderHistoryModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>("today");

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    const dateFilter = getDateFilter(dateRange);
    const matchesDate = !dateFilter || new Date(order.timestamp) >= dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalSales = filteredOrders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <History className="w-5 h-5" />
            Order History
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Search by order # or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-48 h-9"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-9">
                <Filter className="w-4 h-4 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "completed", "pending", "cancelled", "refunded"].map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s === "all" ? "All Status" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
              <SelectTrigger className="w-32 h-9">
                <Calendar className="w-4 h-4 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: "today", label: "Today" },
                  { value: "week",  label: "This Week" },
                  { value: "month", label: "This Month" },
                  { value: "all",   label: "All Time" },
                ].map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Orders list */}
          <div className="border rounded-lg overflow-hidden divide-y">
            {!filteredOrders.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No orders found</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="flex items-start justify-between px-4 py-4 hover:bg-muted/30 transition-colors">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{order.orderNumber}</span>
                      <Badge
                        variant={
                          order.status === "completed" ? "default" :
                          order.status === "pending"   ? "secondary" :
                          order.status === "refunded"  ? "outline" : "destructive"
                        }
                        className={`text-xs ${order.status === "refunded" ? "border-orange-500 text-orange-600" : ""}`}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{order.customerName}</span>
                      <span className="text-muted-foreground ml-2">
                        · {order.items.length} items · {formatCurrency(order.total)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(order.timestamp)}
                    </p>
                    {order.paymentMethod === "cash" && order.amountPaid && (
                      <p className="text-xs text-muted-foreground">
                        Paid: {formatCurrency(order.amountPaid)} · Change: {formatCurrency(order.change || 0)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-3 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onViewDetails(order)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onReprint(order)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between text-sm text-muted-foreground pt-1">
            <span>Total Orders: <span className="font-semibold text-foreground">{filteredOrders.length}</span></span>
            <span>Total Sales: <span className="font-semibold text-foreground">{formatCurrency(totalSales)}</span></span>
          </div>
        </DialogBody>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} className="h-10">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
