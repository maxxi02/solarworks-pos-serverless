"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
  MouseSensor,
  closestCorners,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Plus, Upload } from "lucide-react";

import DraggableProductCard from "./_components/DraggableProductCard";
import CartItem from "./_components/CartItem";
import OrderTypeSelector from "./_components/OrderTypeSelector";
import ProductOverlay from "./_components/ProductOverlay";

// ──────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
};

type CartItemType = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

// ──────────────────────────────────────────────
//  Mock data
// ──────────────────────────────────────────────

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Whipped Coffee",
    price: 45,
    category: "Shop Coffee",
    imageUrl: "/images/whipped.jpg",
  },
  {
    id: "2",
    name: "Filter Coffee",
    price: 22,
    category: "Shop Coffee",
    imageUrl: "/images/filter.jpg",
  },
  {
    id: "3",
    name: "Cold Coffee",
    price: 45,
    category: "Cold Brew Special Drinks",
    imageUrl: "/images/cold.jpg",
  },
  {
    id: "4",
    name: "Bulletproof Coffee",
    price: 35,
    category: "Cold Brew Special Drinks",
  },
  { id: "5", name: "Cappuccino", price: 55, category: "Espresso Coffee" },
  {
    id: "6",
    name: "Iced Coffee",
    price: 55,
    category: "Cold Brew Special Drinks",
  },
  {
    id: "7",
    name: "Authentic Espresso",
    price: 40,
    category: "Espresso Coffee",
  },
  { id: "8", name: "Caffeine Coffee", price: 60, category: "Seasonal Drinks" },
];

// Cart Drop Zone Component
function CartDropZone({ isOver }: { isOver: boolean }) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: "cart-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        relative min-h-[200px] transition-all duration-200
        ${isOver ? "border-2 border-dashed border-blue-400 bg-blue-50" : "border-2 border-dashed border-transparent"}
      `}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {isOverDroppable || isOver ? (
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-blue-600 font-medium">Drop to add to cart</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  Main Component
// ──────────────────────────────────────────────

export default function OrdersPage() {
  const [orderType, setOrderType] = useState<"Pickup" | "Delivery" | "Dine In">(
    "Pickup",
  );
  const [cart, setCart] = useState<CartItemType[]>([
    {
      id: "initial-1",
      productId: "1",
      name: "Whipped Coffee",
      price: 45,
      quantity: 1,
      imageUrl: "/images/whipped.jpg",
    },
  ]);
  const [search, setSearch] = useState("");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeCartItemId, setActiveCartItemId] = useState<string | null>(null);
  const [isOverCart, setIsOverCart] = useState(false);

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    // Check if dragging from products
    const product = mockProducts.find((p) => p.id === active.id);
    if (product) {
      setActiveProduct(product);
    } else {
      // Check if dragging from cart
      const cartItem = cart.find((item) => item.id === active.id);
      if (cartItem) {
        setActiveCartItemId(active.id as string);
      }
    }
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;

    // Check if dragging over cart area
    if (over?.id === "cart-drop-zone") {
      setIsOverCart(true);
    } else {
      setIsOverCart(false);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset states
    setActiveProduct(null);
    setActiveCartItemId(null);
    setIsOverCart(false);

    if (!over) return;

    console.log("Drag ended:", { activeId: active.id, overId: over.id });

    // Handle product drop into cart
    if (over.id === "cart-drop-zone") {
      const product = mockProducts.find((p) => p.id === active.id);
      if (product) {
        console.log("Adding product to cart:", product.name);
        addToCart(product);
        return;
      }
    }

    // Handle cart item reordering
    if (active.id !== over.id && over.id !== "cart-drop-zone") {
      const activeIndex = cart.findIndex((item) => item.id === active.id);
      const overIndex = cart.findIndex((item) => item.id === over.id);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        setCart((items) => arrayMove(items, activeIndex, overIndex));
      }
    }
  };

  // Add to cart
  const addToCart = (product: Product) => {
    console.log("addToCart called for:", product.name);
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      const newItem: CartItemType = {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl,
      };
      console.log("Adding new item to cart:", newItem);
      return [...prev, newItem];
    });
  };

  // Add to cart via button
  const handleAddToCart = (product: Product) => {
    addToCart(product);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculate totals
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const tax = subtotal * 0.12;
  const total = subtotal + tax;

  // Filter products based on search
  const filteredProducts = useMemo(
    () =>
      mockProducts.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach((product) => {
      if (!groups[product.category]) {
        groups[product.category] = [];
      }
      groups[product.category].push(product);
    });
    return groups;
  }, [filteredProducts]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-slate-50">
        {/* LEFT ─ Products */}
        <div className="w-3/5 flex flex-col border-r bg-white">
          <div className="p-4 border-b flex items-center gap-4 sticky top-0 bg-white z-10">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
            <Button variant="outline" onClick={clearCart}>
              Clear Cart
            </Button>
            <Button onClick={() => {}}>+ Add Item</Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {Object.entries(groupedProducts).map(([category, products]) => (
              <div key={category} className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-slate-700">
                  {category}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product) => (
                    <DraggableProductCard
                      key={product.id}
                      product={product}
                      onAdd={() => handleAddToCart(product)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* RIGHT ─ Cart */}
        <div className="w-2/5 flex flex-col bg-white border-l">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart Items
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Order #000{String(cart.length + 100).padStart(3, "0")} •{" "}
              {new Date().toLocaleDateString()}
            </p>
          </div>

          <OrderTypeSelector value={orderType} onChange={setOrderType} />

          {/* Cart Area */}
          <div className="flex-1 relative min-h-0">
            <ScrollArea className="absolute inset-0">
              <div className="p-4">
                <CartDropZone isOver={isOverCart} />

                {cart.length === 0 && !isOverCart ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                    <div className="w-24 h-24 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <ShoppingCart className="h-12 w-12 text-slate-400" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      Your cart is empty
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Drag products here or click the + button
                    </p>
                  </div>
                ) : (
                  <SortableContext
                    items={cart.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 pt-4">
                      {cart.map((item) => (
                        <CartItem
                          key={item.id}
                          item={item}
                          onQuantityChange={(delta) =>
                            updateQuantity(item.id, delta)
                          }
                          onRemove={() => removeItem(item.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Cart Summary */}
          <div className="p-4 border-t bg-white">
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (12%)</span>
                <span>₱{tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg pt-1">
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <Button variant="outline">Cash</Button>
              <Button variant="outline">Card</Button>
              <Button variant="outline">E-Wallet</Button>
            </div>

            <Button
              className="w-full mt-4 h-12 text-lg font-medium"
              disabled={cart.length === 0}
            >
              Place Order
            </Button>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={{ duration: 200 }}>
          {activeProduct && <ProductOverlay product={activeProduct} />}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
