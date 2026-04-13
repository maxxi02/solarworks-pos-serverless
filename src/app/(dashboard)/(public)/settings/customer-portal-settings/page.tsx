"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Palette,
  ImageIcon,
  RotateCcw,
  Upload,
  X,
  Type,
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

interface Branding {
  primaryColor: string;
  accentColor:  string;
  logoText:     string;
  logoUrl:      string;
  logoFont:     string;
}

const DEFAULT_BRANDING: Branding = {
  primaryColor: "#E8621A",
  accentColor:  "#8B3A00",
  logoText:     "RENDEZVOUS",
  logoUrl:      "",
  logoFont:     "Cardo",
};

/** Curated logo fonts — must match BrandingProvider.LOGO_FONTS */
const LOGO_FONTS = [
  { name: "Cardo",              label: "Cardo",              style: "'Cardo', Georgia, serif",            tag: "Serif" },
  { name: "Playfair Display",   label: "Playfair Display",   style: "'Playfair Display', Georgia, serif", tag: "Serif" },
  { name: "Cormorant Garamond", label: "Cormorant Garamond", style: "'Cormorant Garamond', serif",        tag: "Serif" },
  { name: "Lora",               label: "Lora",               style: "'Lora', Georgia, serif",             tag: "Serif" },
  { name: "Cinzel",             label: "Cinzel",             style: "'Cinzel', serif",                   tag: "Elegant" },
  { name: "Bebas Neue",         label: "Bebas Neue",         style: "'Bebas Neue', sans-serif",           tag: "Bold" },
  { name: "Montserrat",         label: "Montserrat",         style: "'Montserrat', sans-serif",          tag: "Modern" },
  { name: "Raleway",            label: "Raleway",            style: "'Raleway', sans-serif",             tag: "Geometric" },
  { name: "Dancing Script",     label: "Dancing Script",     style: "'Dancing Script', cursive",         tag: "Script" },
  { name: "Pacifico",           label: "Pacifico",           style: "'Pacifico', cursive",               tag: "Friendly" },
  { name: "Black Han Sans",     label: "Black Han Sans",     style: "'Black Han Sans', sans-serif",     tag: "Display" },
];

/** A curated set of preset color schemes the admin can pick from */
const COLOR_PRESETS = [
  { name: "Ember (Default)", primary: "#E8621A", accent: "#8B3A00" },
  { name: "Ocean Blue",      primary: "#1A6BE8", accent: "#003A8B" },
  { name: "Forest Green",    primary: "#1DAE5A", accent: "#0A5C2E" },
  { name: "Royal Purple",    primary: "#7C3AED", accent: "#3B0D8B" },
  { name: "Rose Pink",       primary: "#E8356A", accent: "#8B0038" },
  { name: "Midnight",        primary: "#64748B", accent: "#1E293B" },
  { name: "Gold",            primary: "#D4A017", accent: "#7A5A00" },
  { name: "Teal",            primary: "#0D9488", accent: "#04514B" },
];

const MAX_FEATURED = 5;

// ─── Section Card wrapper ─────────────────────────────────────────────────────
function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-base">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="border-t pt-4">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CustomerPortalSettingsPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  // ── Featured products state ────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<"food" | "drink">("food");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Branding state ────────────────────────────────────────────
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [brandingDirty, setBrandingDirty] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // ── Preload all picker fonts so the grid shows real previews ──────────────
  useEffect(() => {
    const families = LOGO_FONTS.map((f) => {
      const slug = f.name.replace(/ /g, "+");
      return `family=${slug}`;
    }).join("&");
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
  }, []);

  // ── Logo image upload to Cloudinary via /api/upload/logo ──────────────────
  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      updateBranding({ logoUrl: data.url });
      toast.success("Logo uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed. Try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // ── Fetch initial data ─────────────────────────────────────────────────────
  const fetchInitialData = useCallback(async () => {
    try {
      const [settingsRes, categoriesRes] = await Promise.all([
        fetch("/api/settings/portal"),
        fetch("/api/products/categories"),
      ]);

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setSelectedIds(new Set(settings.featuredProductIds ?? []));
        if (settings.branding) {
          setBranding({ ...DEFAULT_BRANDING, ...settings.branding });
        }
      }

      if (categoriesRes.ok) {
        const cats: Category[] = await categoriesRes.json();
        setCategories(cats);
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

  // ── Fetch paginated products ───────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTabChange = (val: string) => {
    const newType = val as "food" | "drink";
    setActiveTab(newType);
    setSearch("");
    const firstOfTab = categories.find((c) => c.menuType === newType);
    if (firstOfTab) {
      setActiveCategoryId(firstOfTab._id);
      setPage(1);
    } else {
      setActiveCategoryId("");
      setProducts([]);
    }
  };

  const handleCategoryChange = (catId: string) => {
    if (activeCategoryId !== catId) {
      setActiveCategoryId(catId);
      setPage(1);
    }
  };

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

  const updateBranding = (patch: Partial<Branding>) => {
    setBranding((prev) => ({ ...prev, ...patch }));
    setBrandingDirty(true);
  };

  const applyPreset = (primary: string, accent: string) => {
    updateBranding({ primaryColor: primary, accentColor: accent });
  };

  const resetBranding = () => {
    setBranding(DEFAULT_BRANDING);
    setBrandingDirty(true);
  };

  // ── Save (featured + branding together) ──────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/portal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featuredProductIds: Array.from(selectedIds),
          branding,
        }),
      });

      if (res.ok) {
        toast.success("Portal settings saved!");
        setBrandingDirty(false);
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

  const activeCategories = categories.filter((c) => c.menuType === activeTab);

  // Live preview colours
  const previewPrimary = branding.primaryColor || DEFAULT_BRANDING.primaryColor;
  const previewAccent  = branding.accentColor  || DEFAULT_BRANDING.accentColor;

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Customer Portal Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage featured products, color scheme, and logo for the Rendezvous Cafe portal.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchInitialData(); fetchProducts(); }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save Changes"}
            {brandingDirty && !saving && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </Button>
        </div>
      </div>

      {/* ── Branding / Color Scheme ───────────────────────────────────────── */}
      <SectionCard
        icon={<Palette className="w-5 h-5" />}
        title="Color Scheme"
        description="Choose the primary and accent colors used across the customer portal."
      >
        {/* Live preview bar */}
        <div
          className="mb-5 h-10 rounded-lg flex overflow-hidden shadow-inner"
          title="Live color preview"
        >
          <div className="flex-1 flex items-center justify-center text-white text-xs font-bold tracking-widest uppercase"
            style={{ background: `linear-gradient(135deg, ${previewPrimary} 0%, ${previewAccent} 100%)` }}>
            Preview — {branding.logoText || "RENDEZVOUS"}
            <span style={{ color: previewPrimary, filter: "brightness(2)" }}>.</span>
          </div>
        </div>

        {/* Preset swatches */}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Quick Presets
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {COLOR_PRESETS.map((p) => {
            const active =
              branding.primaryColor === p.primary &&
              branding.accentColor === p.accent;
            return (
              <button
                key={p.name}
                onClick={() => applyPreset(p.primary, p.accent)}
                className={`group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-150 hover:border-primary/60 ${
                  active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border"
                }`}
              >
                {/* Color swatch */}
                <span
                  className="w-5 h-5 rounded-full shrink-0 border border-white/20 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${p.primary} 40%, ${p.accent} 100%)` }}
                />
                <span className="truncate text-xs">{p.name}</span>
                {active && (
                  <CheckCircle2 className="ml-auto w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom colour inputs */}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Custom Colors
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                placeholder="#E8621A"
                className="font-mono text-sm uppercase"
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Accent / Gradient Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.accentColor}
                onChange={(e) => updateBranding({ accentColor: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              />
              <Input
                value={branding.accentColor}
                onChange={(e) => updateBranding({ accentColor: e.target.value })}
                placeholder="#8B3A00"
                className="font-mono text-sm uppercase"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        <button
          onClick={resetBranding}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to defaults
        </button>
      </SectionCard>

      {/* ── Logo Settings ─────────────────────────────────────────────────── */}
      <SectionCard
        icon={<ImageIcon className="w-5 h-5" />}
        title="Portal Logo"
        description="Configure the logo text and optionally provide a custom image URL to replace the text logo."
      >
        <div className="space-y-5">
          {/* Logo text */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Logo Text</label>
            <p className="text-xs text-muted-foreground">
              Shown in the navbar, footer, and menu page.
            </p>
            <Input
              value={branding.logoText}
              onChange={(e) => updateBranding({ logoText: e.target.value })}
              placeholder="RENDEZVOUS"
              className="max-w-xs"
              maxLength={40}
            />
          </div>

          {/* Font picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium">Logo Font</label>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose the typeface for the logo across the landing page, navbar, footer, and menu.
            </p>

            {/* Font grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {LOGO_FONTS.map((f) => {
                const active = (branding.logoFont || DEFAULT_BRANDING.logoFont) === f.name;
                return (
                  <button
                    key={f.name}
                    onClick={() => updateBranding({ logoFont: f.name })}
                    className={`relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all duration-150 hover:border-primary/60 ${
                      active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border"
                    }`}
                  >
                    {/* Sample text in the actual font */}
                    <span
                      className="text-lg leading-tight text-foreground"
                      style={{ fontFamily: f.style, fontWeight: 400 }}
                    >
                      {branding.logoText || "RENDEZVOUS"}
                    </span>
                    <div className="flex items-center justify-between w-full mt-1">
                      <span className="text-[10px] text-muted-foreground font-medium truncate">{f.label}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0 ml-1">
                        {f.tag}
                      </span>
                    </div>
                    {active && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Live preview of selected font */}
            <div className="mt-2 p-4 rounded-lg bg-muted/40 border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
              <p
                className="text-3xl tracking-wider"
                style={{
                  fontFamily: LOGO_FONTS.find(f => f.name === (branding.logoFont || DEFAULT_BRANDING.logoFont))?.style
                    ?? "'Cardo', Georgia, serif",
                  color: previewPrimary,
                }}
              >
                {branding.logoText || "RENDEZVOUS"}
                <span style={{ color: previewAccent }}>.</span>
              </p>
            </div>
          </div>

          {/* ── Custom Logo Image Upload ────────────────────────────────── */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                Custom Logo Image
                <Badge variant="secondary" className="text-[10px] ml-1">Optional</Badge>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a PNG, SVG, or WebP image (max 5 MB). It will be stored in Cloudinary and
                replace the text logo across the navbar when set.
              </p>
            </div>

            {/* Hidden file input */}
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />

            {/* Drop zone */}
            {!branding.logoUrl ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setLogoDragOver(true); }}
                onDragLeave={() => setLogoDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setLogoDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
                onClick={() => !uploadingLogo && logoFileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
                  logoDragOver
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                {uploadingLogo ? (
                  <>
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-xs text-muted-foreground font-medium">Uploading to Cloudinary…</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">Drop image here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-0.5">PNG, SVG, WebP, JPG • Max 5 MB</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Preview of uploaded logo */
              <div className="flex items-start gap-4 p-4 rounded-xl border bg-muted/30">
                <div className="shrink-0 h-16 w-32 rounded-lg bg-background border flex items-center justify-center overflow-hidden">
                  <img
                    src={branding.logoUrl}
                    alt="Logo preview"
                    className="h-full max-w-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground mb-0.5">Logo uploaded ✓</p>
                  <p className="text-[11px] text-muted-foreground break-all line-clamp-2">{branding.logoUrl}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={uploadingLogo}
                      onClick={() => logoFileInputRef.current?.click()}
                    >
                      <Upload className="w-3 h-3 mr-1.5" />
                      Replace
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => updateBranding({ logoUrl: "" })}
                    >
                      <X className="w-3 h-3 mr-1.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Featured Products ─────────────────────────────────────────────── */}
      <SectionCard
        icon={<Star className="w-5 h-5" />}
        title="Featured Products (Best Sellers)"
        description={`Select up to ${MAX_FEATURED} products to highlight on the portal landing page.`}
      >
        {/* Selection counter */}
        <div className="flex items-center gap-3 mb-4">
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

        {/* Tabs & search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b mb-4">
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

        {/* Category pills */}
        {activeCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
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

        {/* Product grid */}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    <div className="absolute top-2 right-2">
                      {isSelected ? (
                        <CheckCircle2 className="w-6 h-6 text-primary drop-shadow-lg" />
                      ) : (
                        <Circle className="w-6 h-6 text-white/60 drop-shadow-lg group-hover:text-white/90 transition-colors" />
                      )}
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <Star className="w-2.5 h-2.5 fill-white" />
                          Featured
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-card flex flex-col gap-1">
                    <p className="text-sm font-semibold leading-tight line-clamp-2">{product.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-primary">
                        ₱{product.price.toFixed(2)}
                      </span>
                    </div>
                    {!product.available && (
                      <span className="text-[10px] text-destructive font-medium">Unavailable</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex justify-center">
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
      </SectionCard>

      {/* Sticky save footer on mobile */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-50">
        <Button className="w-full shadow-lg" size="lg" onClick={handleSave} disabled={saving}>
          <Save className="w-5 h-5 mr-2" />
          {saving ? "Saving..." : `Save Changes`}
        </Button>
      </div>
    </div>
  );
}
