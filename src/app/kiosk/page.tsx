"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ShoppingCart, Coffee, UtensilsCrossed, Loader2, Search, RefreshCw } from "lucide-react";
import { KioskProductCard, KioskProduct } from "./_components/KioskProductCard";
import { KioskCart, KioskCartItem } from "./_components/KioskCart";
import { KioskPaymentPanel } from "./_components/KioskPaymentPanel";

type KioskView = "menu" | "payment";

interface CategoryData {
  name: string;
  menuType: "food" | "drink";
  products?: KioskProduct[];
}

export default function KioskPage() {
  const [view, setView] = useState<KioskView>("menu");
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<KioskCartItem[]>([]);
  const [selectedMenuType, setSelectedMenuType] = useState<"all" | "food" | "drink">("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");
  const [searchQuery, setSearchQuery] = useState("");
  const [adIndex, setAdIndex] = useState(0);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Advertisement slides (placeholder — swap with real images as needed)
  const adSlides = [
    { bg: "from-amber-900/80 to-amber-700/60", emoji: "☕", headline: "Start your day right", sub: "Fresh brews served daily" },
    { bg: "from-rose-900/80 to-rose-700/60", emoji: "🍰", headline: "Desserts you'll love", sub: "Handcrafted with care" },
    { bg: "from-emerald-900/80 to-emerald-700/60", emoji: "🥗", headline: "Fresh bites, bold flavors", sub: "Quality ingredients always" },
  ];

  // Rotate ads every 5 seconds
  useEffect(() => {
    const t = setInterval(() => setAdIndex((i) => (i + 1) % adSlides.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Reset after success
  useEffect(() => {
    if (!orderSuccess) return;
    const t = setTimeout(() => {
      setCart([]);
      setCustomerName("");
      setView("menu");
      setOrderSuccess(false);
    }, 6000);
    return () => clearTimeout(t);
  }, [orderSuccess]);

  const fetchMenu = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/products/categories");
      const data: CategoryData[] = await res.json();
      setCategories(data);
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Flatten + deduplicate products
  const allProducts = useMemo(() => {
    const seen = new Map<string, KioskProduct & { category: string; menuType: "food" | "drink" }>();
    categories.forEach((cat) =>
      (cat.products ?? [])
        .filter((p) => p.available)
        .forEach((p) => {
          if (!seen.has(p._id)) {
            seen.set(p._id, { ...p, category: cat.name, menuType: cat.menuType });
          }
        }),
    );
    return Array.from(seen.values());
  }, [categories]);

  const categoryTabs = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          allProducts
            .filter((p) => selectedMenuType === "all" || p.menuType === selectedMenuType)
            .map((p) => p.category ?? "Other"),
        ),
      ),
    ],
    [allProducts, selectedMenuType],
  );

  const filteredProducts = useMemo(
    () =>
      allProducts.filter(
        (p) =>
          (selectedMenuType === "all" || p.menuType === selectedMenuType) &&
          (selectedCategory === "All" || p.category === selectedCategory) &&
          (searchQuery === "" || p.name.toLowerCase().includes(searchQuery.toLowerCase())),
      ),
    [allProducts, selectedMenuType, selectedCategory, searchQuery],
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart],
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity, 0),
    [cart],
  );

  const getQty = (id: string) => cart.find((i) => i._id === id)?.quantity ?? 0;

  const addToCart = (product: KioskProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      if (existing) return prev.map((i) => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => i._id === id ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i._id !== id));
  };

  const handleConfirmOrder = async (method: "cash" | "qrph") => {
    const body = {
      customerName: customerName || "Kiosk Guest",
      items: cart.map((i) => ({
        _id: i._id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        menuType: i.menuType,
        category: i.category,
      })),
      subtotal,
      total: subtotal,
      paymentMethod: method,
      orderType,
    };
    const res = await fetch("/api/kiosk/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Order failed");
    return { orderId: data.orderId, orderNumber: data.orderNumber };
  };

  const handlePaymentSuccess = () => {
    setOrderSuccess(true);
  };

  const ad = adSlides[adIndex];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* ═══════════════════════════ LEFT: Advertisement ═══════════════════════════ */}
      <div className="w-[38%] flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-muted/40 to-muted/10 border-r border-border">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-primary blur-2xl" />
        </div>

        <div className="relative h-full flex flex-col">
          {/* Store branding */}
          <div className="px-10 pt-10 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Coffee className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">Rendezvous</h1>
                <p className="text-xs text-muted-foreground font-medium tracking-widest uppercase">Café</p>
              </div>
            </div>
          </div>

          {/* Ad slide */}
          <div className="flex-1 flex flex-col items-center justify-center px-10 gap-6">
            <div
              key={adIndex}
              className={`w-full rounded-3xl bg-gradient-to-br ${ad.bg} border border-white/10 p-10 flex flex-col items-center gap-5 shadow-2xl transition-all duration-700`}
            >
              <div className="text-7xl">{ad.emoji}</div>
              <div className="text-center">
                <h2 className="text-3xl font-black text-white leading-tight">{ad.headline}</h2>
                <p className="text-white/70 mt-2 text-base">{ad.sub}</p>
              </div>
            </div>

            {/* Ad dots */}
            <div className="flex gap-2">
              {adSlides.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setAdIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${i === adIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
                />
              ))}
            </div>
          </div>

          {/* Kiosk info */}
          <div className="px-10 py-8 text-center">
            <div className="bg-card/50 border border-border rounded-2xl p-4">
              <p className="text-sm font-semibold text-foreground">Self-Order Kiosk</p>
              <p className="text-xs text-muted-foreground mt-0.5">Browse · Order · Pay</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ RIGHT: Menu / Cart / Payment ═══════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {view === "payment" ? (
          /* ── Payment view ── */
          <KioskPaymentPanel
            total={subtotal}
            customerName={customerName}
            onBack={() => setView("menu")}
            onSuccess={handlePaymentSuccess}
            onConfirmOrder={handleConfirmOrder}
          />
        ) : (
          /* ── Menu + Cart split ── */
          <div className="flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-card/30">
              <div className="flex gap-2 items-center">
                <h2 className="text-xl font-black text-foreground">Menu</h2>
                <div className="flex gap-1">
                  {(["all", "food", "drink"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setSelectedMenuType(t); setSelectedCategory("All"); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedMenuType === t ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}
                    >
                      {t === "food" && <UtensilsCrossed className="w-3 h-3" />}
                      {t === "drink" && <Coffee className="w-3 h-3" />}
                      {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 py-1.5 w-48">
                <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search…"
                  className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
                />
              </div>

              {/* Refresh */}
              <button onClick={fetchMenu} className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* ── Products panel ── */}
              <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
                {/* Category filter */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border bg-muted/10 flex-shrink-0">
                  {categoryTabs.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Products grid */}
                <div className="flex-1 overflow-y-auto p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                      <UtensilsCrossed className="w-10 h-10 opacity-20" />
                      <p className="text-sm">No items found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                      {filteredProducts.map((product) => (
                        <KioskProductCard
                          key={product._id}
                          product={product}
                          onAdd={addToCart}
                          quantity={getQty(product._id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Cart panel ── */}
              <div className="w-80 flex-shrink-0 flex flex-col bg-card/20">
                {/* Cart header */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/30">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <span className="font-bold text-foreground text-sm">My Order</span>
                    {cartCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-black">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  {/* Order type toggle */}
                  <div className="flex gap-1">
                    {(["dine-in", "takeaway"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setOrderType(t)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${orderType === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {t === "dine-in" ? "Dine In" : "Takeaway"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer name */}
                <div className="px-4 py-2 border-b border-border">
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full text-sm bg-muted/30 border border-border rounded-xl px-3 py-2 outline-none focus:border-primary/60 placeholder:text-muted-foreground transition-colors"
                  />
                </div>

                {/* Cart items */}
                <div className="flex-1 overflow-hidden px-4 py-3">
                  <KioskCart
                    items={cart}
                    onUpdate={updateQty}
                    onRemove={removeFromCart}
                    subtotal={subtotal}
                    onCheckout={() => { if (cart.length > 0) setView("payment"); }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
