"use client";

import { useState } from 'react';
import {Coffee, Utensils, Plus, X, Upload, Trash2, Package } from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
  icon: "coffee" | "utensils";
}

const categories: CategoryOption[] = [
  { id: "espresso", name: "Espresso", icon: "coffee" },
  { id: "refreshers", name: "Refreshers", icon: "coffee" },
  { id: "specials", name: "Specials", icon: "coffee" },
  { id: "frappe", name: "Frappe", icon: "coffee" },
  { id: "breakfast", name: "All Day Breakfast", icon: "utensils" },
  { id: "snacks", name: "Snack Attack", icon: "utensils" },
  { id: "pasta", name: "Pasta", icon: "utensils" },
  { id: "breads-pastries", name: "Breads + Pastries", icon: "utensils" },
  { id: "sweet-tooth", name: "Sweet Tooth", icon: "utensils" },
];

interface Variant {
  name: string;
  price: number;
}

interface RawMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

const AddProductPage = () => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [variants, setVariants] = useState<Variant[]>([{ name: "", price: 0 }]);
  const [hasVariants, setHasVariants] = useState(false);
  
  // Modal states
  const [showRawMaterialModal, setShowRawMaterialModal] = useState(false);
  const [newRawMaterial, setNewRawMaterial] = useState({
    name: "",
    quantity: "",
    unit: "pcs"
  });

  const handleAddVariant = () => {
    setVariants([...variants, { name: "", price: 0 }]);
  };

  const handleVariantChange = (
    index: number,
    field: keyof Variant,
    value: string,
  ) => {
    const updatedVariants = [...variants];
    if (field === "price") {
      updatedVariants[index][field] = parseFloat(value) || 0;
    } else {
      updatedVariants[index][field] = value;
    }
    setVariants(updatedVariants);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 1) {
      const updatedVariants = variants.filter((_, i) => i !== index);
      setVariants(updatedVariants);
    }
  };

  // Raw Material handlers
  const handleAddRawMaterial = () => {
    if (newRawMaterial.name.trim() && newRawMaterial.quantity) {
      const newMaterial: RawMaterial = {
        id: Date.now().toString(),
        name: newRawMaterial.name.trim(),
        quantity: parseFloat(newRawMaterial.quantity),
        unit: newRawMaterial.unit
      };
      setRawMaterials([...rawMaterials, newMaterial]);
      setNewRawMaterial({ name: "", quantity: "", unit: "pcs" });
      setShowRawMaterialModal(false);
    }
  };

  const handleRemoveRawMaterial = (id: string) => {
    setRawMaterials(rawMaterials.filter(material => material.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log({
      name,
      category,
      basePrice: parseFloat(basePrice),
      rawMaterials,
      variants: hasVariants ? variants : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title - Matched to ProductsPage style */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Add New Product
          </h2>
          <p className="text-muted-foreground">
            Add a new product to your menu. Fill in all required details.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-lg border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Name */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Product Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g., Iced Coffee Jelly"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-3 text-sm font-medium transition-all duration-200 ${
                      category === cat.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    }`}
                  >
                    {cat.icon === "coffee" ? (
                      <Coffee className="h-4 w-4" />
                    ) : (
                      <Utensils className="h-4 w-4" />
                    )}
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasVariants"
                  checked={hasVariants}
                  onChange={(e) => {
                    setHasVariants(e.target.checked);
                    if (!e.target.checked) {
                      setVariants([{ name: "", price: 0 }]);
                    }
                  }}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label
                  htmlFor="hasVariants"
                  className="text-sm font-medium text-foreground"
                >
                  This product has multiple variants (e.g., Solo, Barkada)
                </label>
              </div>

              {!hasVariants ? (
                <div className="space-y-2">
                  <label
                    htmlFor="basePrice"
                    className="text-sm font-medium text-foreground"
                  >
                    Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground">
                      ₱
                    </span>
                    <input
                      type="number"
                      id="basePrice"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Variants
                    </label>
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      <Plus className="h-4 w-4" />
                      Add Variant
                    </button>
                  </div>

                  <div className="space-y-3">
                    {variants.map((variant, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) =>
                              handleVariantChange(index, "name", e.target.value)
                            }
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Variant name (e.g., Solo)"
                            required
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground">
                              ₱
                            </span>
                            <input
                              type="number"
                              value={variant.price || ""}
                              onChange={(e) =>
                                handleVariantChange(
                                  index,
                                  "price",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                        </div>
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(index)}
                            className="rounded-md p-2 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Raw Materials */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Raw Materials
                </label>
                <button
                  type="button"
                  onClick={() => setShowRawMaterialModal(true)}
                  className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <Plus className="h-4 w-4" />
                  Add Raw Material
                </button>
              </div>

              {rawMaterials.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-secondary/50 p-6 text-center">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No raw materials added yet
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowRawMaterialModal(true)}
                    className="mt-3 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    Add Your First Raw Material
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-background">
                  <div className="overflow-hidden rounded-lg">
                    <table className="w-full">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                            Material
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                            Unit
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rawMaterials.map((material) => (
                          <tr key={material.id} className="hover:bg-secondary/50">
                            <td className="px-4 py-3 text-sm text-foreground">
                              {material.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {material.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {material.unit}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveRawMaterial(material.id)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Image Upload (Optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Product Image (Optional)
              </label>
              <div className="rounded-lg border-2 border-dashed border-border bg-secondary/50 p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag and drop an image here, or click to browse
                </p>
                <input
                  type="file"
                  id="image"
                  className="hidden"
                  accept="image/*"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById("image")?.click()}
                  className="mt-3 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Browse Files
                </button>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                className="rounded-md border border-border bg-background px-6 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add Product
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Raw Material Modal */}
      {showRawMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Add Raw Material
              </h3>
              <button
                onClick={() => setShowRawMaterialModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Material Name
                </label>
                <input
                  type="text"
                  value={newRawMaterial.name}
                  onChange={(e) => setNewRawMaterial({...newRawMaterial, name: e.target.value})}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Coffee Beans, Sugar, Milk"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={newRawMaterial.quantity}
                    onChange={(e) => setNewRawMaterial({...newRawMaterial, quantity: e.target.value})}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="1.5"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Unit
                  </label>
                  <select
                    value={newRawMaterial.unit}
                    onChange={(e) => setNewRawMaterial({...newRawMaterial, unit: e.target.value})}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="pcs">pcs</option>
                    <option value="g">grams (g)</option>
                    <option value="kg">kilograms (kg)</option>
                    <option value="ml">milliliters (ml)</option>
                    <option value="L">liters (L)</option>
                    <option value="tbsp">tablespoon (tbsp)</option>
                    <option value="tsp">teaspoon (tsp)</option>
                    <option value="cup">cup</option>
                    <option value="oz">ounce (oz)</option>
                    <option value="lb">pound (lb)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRawMaterialModal(false)}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddRawMaterial}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Add Material
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProductPage;