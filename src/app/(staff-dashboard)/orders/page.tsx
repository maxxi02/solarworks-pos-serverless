// app/pos/page.tsx
"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Beef, Drumstick, Filter, Fish, Search, Soup, UtensilsCrossed } from "lucide-react";
import { Cookie } from "next/font/google";
import { cn } from "@/lib/utils";
import { ScrollArea } from "radix-ui";

// ── Types ───────────────────────────────────────────────────

interface MenuItem {
  id: number;
  name: string;
  desc: string;
  price: number;
  unit: string;
  status: "normal" | "out";
  qtyBadge: string | null;
  image: string;
}

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  modifiers: string[];
}

// ── Fake Data ────────────────────────────────────────────────

const categories = [
  { id: "soup", label: "Soup", icon: Soup, count: 24 },
  { id: "appetizer", label: "Appetizer", icon: Beef, count: 24, active: true },
  { id: "entrees", label: "Entrees", icon: UtensilsCrossed, count: 24 },
  { id: "snacks", label: "Snacks", icon: Cookie, count: 24 },
  { id: "steak", label: "Steak", icon: Beef, count: 24 },
  { id: "fish", label: "Fish", icon: Fish, count: 24 },
  { id: "chicken", label: "Chicken", icon: Drumstick, count: 24 },
];

const menuItems: MenuItem[] = [
  {
    id: 1,
    name: "Spice lover, curry connoisseur.",
    desc: "Spicy curry with rich flavors",
    price: 12.5,
    unit: "/portion",
    status: "normal",
    qtyBadge: null,
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400",
  },
  {
    id: 2,
    name: "Ramen aficionado, nood...",
    desc: "Ramen aficionado, noodle delight",
    price: 10.0,
    unit: "/portion",
    status: "normal",
    qtyBadge: null,
    image: "https://images.unsplash.com/photo-1617098900591-3cecff8163cd?w=400",
  },
  {
    id: 3,
    name: "Sate Out of Stock",
    desc: "Grilled sate skewers",
    price: 8.0,
    unit: "/portion",
    status: "out",
    qtyBadge: null,
    image: "https://images.unsplash.com/photo-1555939594-58056f625634?w=400",
  },
  {
    id: 4,
    name: "BBQ champion, grill master.",
    desc: "BBQ champion, grill master.",
    price: 15.0,
    unit: "/portion",
    status: "normal",
    qtyBadge: "2x",
    image: "https://images.unsplash.com/photo-1544025162-d76694265952?w=400",
  },
  // Fill with more items...
  ...Array.from({ length: 12 }, (_, i) => ({
    id: 5 + i,
    name: `Menu Item ${6 + i}`,
    desc: "Delicious signature dish",
    price: 7.5 + i * 1.25,
    unit: "/portion",
    status: (i % 4 === 0 ? "out" : "normal") as "normal" | "out",
    qtyBadge: i % 5 === 2 ? `${(i % 3) + 1}x` : null,
    image: `https://images.unsplash.com/photo-1555939594-58056f625634?w=400&auto=format&fit=crop&q=80`,
  })),
];

const initialOrderItems: OrderItem[] = [
  {
    name: "BBQ Champion Grill Master...",
    qty: 2,
    price: 0.5,
    modifiers: ["No Shrimp", "Extra Chicken", "Medium Rare", "Very Well"],
  },
  {
    name: "Pancake Aficianado...",
    qty: 1,
    price: 0.5,
    modifiers: ["Extra Sugar"],
  },
];

// ── Components ───────────────────────────────────────────────

function CategoryButton({
  icon: Icon,
  label,
  count,
  active = false,
}: {
  icon: any;
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex flex-col items-center gap-1.5 min-w-22 py-3 px-3 rounded-xl transition-colors",
        active
          ? "bg-pink-50 text-pink-700 border border-pink-300 shadow-sm"
          : "hover:bg-gray-100",
      )}
    >
      <Icon className="h-8 w-8" strokeWidth={1.8} />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{count} Item</span>
    </button>
  );
}

function DraggableMenuItem({ item }: { item: MenuItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `menu-${item.id}`,
      data: { item },
      disabled: item.status === "out",
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.75 : 1,
    scale: isDragging ? 1.06 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden transition-all duration-150 cursor-grab active:cursor-grabbing select-none",
        isDragging && "ring-2 ring-primary/70 shadow-2xl z-20 scale-[1.04]",
        item.status === "out" && "opacity-60 cursor-not-allowed",
      )}
      {...listeners}
      {...attributes}
    >
      <div className="relative">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-44 object-cover"
        />
        {item.qtyBadge && (
          <Badge className="absolute top-2.5 right-2.5 bg-red-500 hover:bg-red-500">
            {item.qtyBadge}
          </Badge>
        )}
        {item.status === "out" && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <Badge
              variant="outline"
              className="bg-white/90 text-red-700 border-red-400 px-4 py-1.5 text-sm font-medium"
            >
              Out of Stock
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-3.5">
        <h3 className="font-medium leading-tight line-clamp-2 min-h-[2.8rem]">
          {item.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 min-h-12">
          {item.desc}
        </p>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-lg font-bold">${item.price.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">{item.unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DroppableOrderContent({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "current-order" });

  return (
    <div
      ref={setNodeRef}
<<<<<<< HEAD
      className={cn(
        "min-h-60 rounded-lg transition-colors duration-200",
        isOver && "bg-slate-800/40 border-2 border-dashed border-slate-500/70",
      )}
=======
      className={`
        relative min-h-200px transition-all duration-200
        ${isOver ? "border-2 border-dashed border-blue-400 bg-blue-50" : "border-2 border-dashed border-transparent"}
      `}
>>>>>>> cb1f053cdda4a2655dd866e32331cef351ccf27c
    >
      {children}
      {isOver && children === null && (
        <div className="h-40 flex items-center justify-center text-slate-400 italic">
          Drop menu items here...
        </div>
      )}
    </div>
  );
}

function OrderItemDisplay({ item }: { item: OrderItem }) {
  return (
    <div className="pb-4 border-b border-slate-800 last:border-none last:pb-0">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <p className="font-medium leading-tight">{item.name}</p>
          <p className="text-sm text-slate-400 mt-0.5">
            ${item.price.toFixed(2)}
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-slate-700 text-slate-200 border-slate-600 px-2.5"
        >
          {item.qty}x
        </Badge>
      </div>
      {item.modifiers.length > 0 && (
        <div className="mt-1.5 text-xs text-slate-400 space-y-0.5">
          {item.modifiers.map((mod, idx) => (
            <div key={idx}>• {mod}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function POSPage() {
  const [orderType, setOrderType] = useState("dine-in");
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialOrderItems);
  const [activeDrag, setActiveDrag] = useState<MenuItem | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const item = event.active.data.current?.item as MenuItem | undefined;
    if (item) setActiveDrag(item);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);

    if (!over) return;

    if (over.id === "current-order") {
      const draggedItem = active.data.current?.item as MenuItem;
      if (draggedItem && draggedItem.status !== "out") {
        setOrderItems((prev) => [
          ...prev,
          {
            name: draggedItem.name,
            qty: 1,
            price: draggedItem.price,
            modifiers: [],
          },
        ]);
      }
    }
  }

  const total = orderItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50/40">
        {/* LEFT – MENU SECTION */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          {/* Header */}
          <div className="border-b bg-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <UtensilsCrossed size={20} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
            </div>

            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">
                  Clocked in at 10:01
                </p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="border-b bg-white">
            <div className="flex gap-3 p-4 overflow-x-auto pb-4 scrollbar-thin">
              {categories.map((cat) => (
                <CategoryButton
                  key={cat.id}
                  icon={cat.icon}
                  label={cat.label}
                  count={cat.count}
                  active={cat.active}
                />
              ))}
            </div>
          </div>

          {/* Menu Grid */}
          <div className="p-5 flex-1">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold">Select Menu</h2>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Search size={16} />
                  Search
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Filter size={16} />
                  Filter
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {menuItems.map((item) => (
                <DraggableMenuItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT – ORDER PANEL */}
        <div className="w-full lg:w-95 xl:w-105 bg-slate-950 text-white flex flex-col border-l border-slate-800">
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Detail Order</h2>
              <Badge className="bg-blue-600 hover:bg-blue-600">Table #22</Badge>
            </div>

            <div className="mt-4 space-y-1">
              <p className="font-medium">Recipient: Benjamin Nola</p>
              <p className="text-sm text-slate-400">(+1) 08912 81234 223</p>
              <p className="text-sm text-slate-400">Arrived at 09:21 PM</p>
              <p className="text-sm text-slate-500 mt-1">Order #11 • 21:21</p>
            </div>

            <Tabs
              value={orderType}
              onValueChange={setOrderType}
              className="mt-5"
            >
              <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                <TabsTrigger value="dine-in">Dine in</TabsTrigger>
                <TabsTrigger value="takeout">Takeout</TabsTrigger>
                <TabsTrigger value="curbside">Curbside</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1 p-5">
            <DroppableOrderContent>
              <div className="space-y-5">
                {orderItems.map((item, index) => (
                  <OrderItemDisplay key={index} item={item} />
                ))}
              </div>
            </DroppableOrderContent>
          </ScrollArea>

          <div className="p-5 border-t border-slate-800 bg-slate-900">
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span>Items</span>
                <span>{orderItems.length} items</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Discount</span>
                <span>-$5.00</span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>$0.50</span>
              </div>
              <Separator className="my-4 bg-slate-700" />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Save for Later
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 font-semibold">
                  FIRE
                </Button>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-6">
                CHARGE ${total.toFixed(2)}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDrag && (
          <Card className="w-72 shadow-2xl pointer-events-none opacity-90 border-2 border-primary/40">
            <div className="relative">
              <img
                src={activeDrag.image}
                alt={activeDrag.name}
                className="w-full h-40 object-cover rounded-t-lg"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
            </div>
            <div className="p-4 bg-linear-to-b from-transparent to-black/80 rounded-b-lg">
              <h3 className="font-semibold text-white truncate">
                {activeDrag.name}
              </h3>
              <p className="text-sm text-white/90 mt-1">
                ${activeDrag.price.toFixed(2)} {activeDrag.unit}
              </p>
            </div>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
