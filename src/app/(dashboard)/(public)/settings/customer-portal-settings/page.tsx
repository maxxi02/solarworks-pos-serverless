"use client";

import React, { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  ShieldAlert,
  Store,
  Star,
  CheckCircle2,
  Circle,
  Search,
  Save,
  RefreshCw,
  Utensils,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  _id: string;
  name: string;
  price: number;
  imageUrl: string;
  categoryName: string;
  available: boolean;
}

interface Category {
  _id: string;
  name: string;
  menuType: "food" | "drink";
}

const MAX_FEATURED = 5;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CustomerPortalSettingsPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<"food" | "drink">("food");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Pagination & Search state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // ── Fetch Categories & Settings (initial load) ─────────────────────────────
  const fetchInitialData = useCallback(async () => {
    try {
      const [settingsRes, categoriesRes] = await Promise.all([
        fetch("/api/settings/portal"),
        fetch("/api/products/categories"),
      ]);
      
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setSelectedIds(new Set(settings.featuredProductIds ?? []));
      }

      if (categoriesRes.ok) {
        const cats: Category[] = await categoriesRes.json();
        setCategories(cats);
        // Default select first food category
        const firstFood = cats.find((c) => c.menuType === "food");
        if (firstFood) setActiveCategoryId(firstFood._id);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
      toast.error("Failed to load settings.");
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // ── Fetch paginated products for the selected category ─────────────────────
  const fetchProducts = useCallback(async () => {
    if (!activeCategoryId) return;
    
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        categoryId: activeCategoryId,
      });

      const res = await fetch(`/api/products/all?${qs.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setProducts(result.data || []);
        setTotalPages(result.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      toast.error("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, activeCategoryId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Changing Menu Type (Tab) ────────────────────────────────────────────────
  const handleTabChange = (val: string) => {
    const newType = val as "food" | "drink";
    setActiveTab(newType);
    setSearch(""); // clear search on tab switch
    
    const firstOfTab = categories.find((c) => c.menuType === newType);
    if (firstOfTab) {
      setActiveCategoryId(firstOfTab._id);
      setPage(1);
    } else {
      setActiveCategoryId("");
      setProducts([]);
    }
  };

  // ── Changing Category Pill ──────────────────────────────────────────────────
  const handleCategoryChange = (catId: string) => {
    if (activeCategoryId !== catId) {
      setActiveCategoryId(catId);
      setPage(1);
    }
  };

  // ── Toggle product selection ───────────────────────────────────────────────
  const toggleProduct = (id: string) => {
    if (!isAdmin) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_FEATURED) {
          toast.warning(`You can only select up to ${MAX_FEATURED} featured products.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  // ── Save featured list ─────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/portal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredProductIds: Array.from(selectedIds) }),
      });

      if (res.ok) {
        toast.success("Featured products saved!");
      } else {
        const err = await res.json();
        toast.error(err?.error ?? "Failed to save settings.");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // ── Access denied ─────────────────────────────────────────────────────────
  if (!sessionPending && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <ShieldAlert className="w-16 h-16 text-destructive opacity-70" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground max-w-sm">
          Only administrators can manage Customer Portal Settings.
        </p>
      </div>
    );
  }

  // Active Category Pills
  const activeCategories = categories.filter((c) => c.menuType === activeTab);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Customer Portal Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Select up to{" "}
            <span className="font-semibold text-foreground">{MAX_FEATURED}</span>{" "}
            products to feature as{" "}
            <span className="font-semibold text-foreground">Best Sellers</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => { fetchInitialData(); fetchProducts(); }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Selection counter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Star className="w-4 h-4 text-primary fill-primary" />
          <span className="text-sm font-semibold">
            {selectedIds.size} / {MAX_FEATURED} selected
          </span>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Tabs & Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="food" className="gap-2">
              <Utensils className="w-4 h-4" /> Food
            </TabsTrigger>
            <TabsTrigger value="drink" className="gap-2">
              <Coffee className="w-4 h-4" /> Drink
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative w-full md:max-w-xs shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search within category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Pills */}
      {activeCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeCategories.map((cat) => (
            <Button
              key={cat._id}
              variant={activeCategoryId === cat._id ? "default" : "secondary"}
              size="sm"
              onClick={() => handleCategoryChange(cat._id)}
              className="rounded-full px-4"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      )}

      {/* Product Grid / Loading State */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : activeCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Store className="w-10 h-10 opacity-30" />
          <p className="text-sm">No {activeTab} categories found.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Search className="w-10 h-10 opacity-30" />
          <p className="text-sm">No products found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((product) => {
            const isSelected = selectedIds.has(product._id);
            return (
              <button
                key={product._id}
                onClick={() => toggleProduct(product._id)}
                className={`group relative flex flex-col rounded-xl overflow-hidden border-2 transition-all duration-200 text-left
                  ${
                    isSelected
                      ? "border-primary shadow-md shadow-primary/20 scale-[1.02]"
                      : "border-border hover:border-primary/40 hover:scale-[1.01]"
                  }
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                `}
              >
                {/* Product image */}
                <div className="relative aspect-square bg-muted overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=300&auto=format&fit=crop";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Store className="w-8 h-8 text-muted-foreground opacity-40" />
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Selection indicator */}
                  <div className="absolute top-2 right-2">
                    {isSelected ? (
                      <CheckCircle2 className="w-6 h-6 text-primary drop-shadow-lg" />
                    ) : (
                      <Circle className="w-6 h-6 text-white/60 drop-shadow-lg group-hover:text-white/90 transition-colors" />
                    )}
                  </div>

                  {/* Featured badge */}
                  {isSelected && (
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <Star className="w-2.5 h-2.5 fill-white" />
                        Featured
                      </span>
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="p-3 bg-card flex flex-col gap-1">
                  <p className="text-sm font-semibold leading-tight line-clamp-2">
                    {product.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-primary">
                      ₱{product.price.toFixed(2)}
                    </span>
                  </div>
                  {!product.available && (
                    <span className="text-[10px] text-destructive font-medium">
                      Unavailable
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination component */}
      {!loading && totalPages > 1 && (
        <div className="mt-8 flex justify-center pb-16 sm:pb-0">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              <PaginationItem>
                <div className="px-4 text-sm font-medium text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
              </PaginationItem>

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Sticky save footer on mobile */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-50">
        <Button className="w-full shadow-lg" size="lg" onClick={handleSave} disabled={saving}>
          <Save className="w-5 h-5 mr-2" />
          {saving ? "Saving..." : `Save ${selectedIds.size} Featured Product${selectedIds.size !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
