'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Utensils,
  Coffee,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { ProductIngredientsForm, ProductIngredient } from '@/components/forms/ProductIngredientsForm';
import { toast } from 'sonner';

// shadcn/ui imports
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Types

type MenuType = 'food' | 'drink';

interface ProductFormData {
  name: string;
  price: number;
  description: string;
  ingredients: ProductIngredient[];
  available: boolean;
  categoryId?: string;
  menuType?: MenuType;
  imageUrl?: string; // ← ADD THIS
}
interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
  pricePerUnit: number;
  supplier?: string;
  status: string;
}

interface Product {
  _id?: string;
  name: string;
  price: number;
  description: string;
  ingredients: ProductIngredient[];
  available: boolean;
  categoryId?: string;
  menuType?: MenuType;
  imageUrl?: string; // ← ADD THIS
  createdAt?: string;
}
interface Category {
  _id?: string;
  name: string;
  description: string;
  menuType: MenuType;
  products: Product[];
  createdAt?: string;
  updatedAt?: string;
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  description
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Category Dialog Component
function CategoryDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; menuType: MenuType }) => Promise<void>;
  initialData?: Category;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [menuType, setMenuType] = useState<MenuType>(initialData?.menuType || 'food');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), menuType });
      onOpenChange(false);
      setName('');
      setDescription('');
      setMenuType('food');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update your category details below.'
              : 'Create a new category for your menu.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Category Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={menuType === 'food' ? 'default' : 'outline'}
                onClick={() => setMenuType('food')}
                className="flex-1"
              >
                <Utensils className="mr-2 h-4 w-4" />
                Food
              </Button>
              <Button
                type="button"
                variant={menuType === 'drink' ? 'default' : 'outline'}
                onClick={() => setMenuType('drink')}
                className="flex-1"
              >
                <Coffee className="mr-2 h-4 w-4" />
                Drink
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Dishes, Beverages"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the category..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {initialData ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              initialData ? 'Update Category' : 'Create Category'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Product Dialog Component
function ProductDialog({
  open,
  onOpenChange,
  category,
  product,
  inventoryItems,
  inventoryLoading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  product?: Product | null;
  inventoryItems: InventoryItem[];
  inventoryLoading: boolean;
  onSubmit: (data: ProductFormData) => Promise<void>;
}) {
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [description, setDescription] = useState(product?.description || '');
  const [available, setAvailable] = useState(product?.available ?? true);
  const [ingredients, setIngredients] = useState<ProductIngredient[]>(product?.ingredients || []);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [imagePreview, setImagePreview] = useState(product?.imageUrl || '');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImageUrl(base64);
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(product.price.toString());
      setDescription(product.description);
      setAvailable(product.available);
      setImageUrl(product?.imageUrl || '');
      setImagePreview(product?.imageUrl || '');

      const convertedIngredients = product.ingredients.map(ing => {
        if ('inventoryItemId' in ing) {
          return ing as ProductIngredient;
        }
        const oldIng = ing as unknown as { name: string; quantity: string | number; unit: string };
        return {
          inventoryItemId: '',
          name: oldIng.name,
          quantity: typeof oldIng.quantity === 'string' ? Number(oldIng.quantity) : oldIng.quantity,
          unit: oldIng.unit
        } as ProductIngredient;
      });
      setIngredients(convertedIngredients);
    } else {
      setName('');
      setPrice('');
      setDescription('');
      setAvailable(true);
      setIngredients([]);
    }
  }, [product]);

  const handleIngredientsChange = useCallback((newIngredients: ProductIngredient[]) => {
    setIngredients(newIngredients);
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Product name is required');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        price: priceNum,
        description: description.trim(),
        ingredients,
        available,
        categoryId: category?._id,
        menuType: category?.menuType,
        imageUrl,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription>
            {category && (
              <Badge variant="outline" className="mt-1">
                {category.menuType === 'food' ? (
                  <Utensils className="mr-1 h-3 w-3" />
                ) : (
                  <Coffee className="mr-1 h-3 w-3" />
                )}
                {category.name}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter product name"
              />
            </div>

            {/* Product Image */}
            <div className="space-y-2">
              <Label>Product Image (Optional)</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative h-20 w-20 rounded-md overflow-hidden border">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setImageUrl(''); setImagePreview(''); }}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl-md px-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="product-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 2MB</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-price">Price (₱)</Label>
              <Input
                id="product-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">Description (Optional)</Label>
              <Textarea
                id="product-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="product-available"
                checked={available}
                onCheckedChange={setAvailable}
              />
              <Label htmlFor="product-available">Product is available for sale</Label>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Ingredients</Label>
              {inventoryItems.length === 0 && !inventoryLoading && (
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">No Inventory Items</p>
                        <p className="text-sm text-muted-foreground">
                          Add items to inventory first before creating products.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <ProductIngredientsForm
                inventoryItems={inventoryItems as any}
                onIngredientsChange={handleIngredientsChange}
                initialIngredients={ingredients}
                loading={inventoryLoading}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !price || ingredients.length === 0}
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {product ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              product ? 'Update Product' : 'Create Product'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CategoriesPage() {
  // States
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Dialog States
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    category?: Category;
  }>({ open: false });

  const [productDialog, setProductDialog] = useState<{
    open: boolean;
    category: Category | null;
    product?: Product | null;
  }>({ open: false, category: null });

  // Delete Dialog State
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'category' | 'product';
    id: string;
    name: string;
    categoryId?: string;
  }>({ open: false, type: 'product', id: '', name: '' });

  // Active Tab
  const [activeTab, setActiveTab] = useState<MenuType>('food');

  // Fetch data on mount
  useEffect(() => {
    fetchCategories();
    fetchInventoryItems();
  }, []);

  // API Functions
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      setInventoryLoading(true);
      const response = await fetch('/api/products/stocks');
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventoryItems(data);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      toast.error('Failed to load inventory');
    } finally {
      setInventoryLoading(false);
    }
  };

  // Category Handlers
  const handleAddCategory = async (data: { name: string; description: string; menuType: MenuType }) => {
    try {
      const response = await fetch('/api/products/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add category');
      }

      const category = await response.json();
      setCategories(prev => [...prev, category]);
      toast.success('Category added successfully');
    } catch (err) {
      console.error('Failed to add category:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add category');
      throw err;
    }
  };

  const handleDeleteCategory = async () => {
    try {
      const response = await fetch(`/api/products/categories/${deleteDialog.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete category');
      }

      setCategories(prev => prev.filter(c => c._id !== deleteDialog.id));
      toast.success('Category deleted successfully');
      setDeleteDialog({ open: false, type: 'category', id: '', name: '' });
    } catch (err) {
      console.error('Failed to delete category:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  // Product Handlers
  const handleAddProduct = async (productData: Product) => {
    try {
      const response = await fetch('/api/products/category-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add product');
      }

      await fetchCategories();
      toast.success('Product added successfully');
    } catch (err) {
      console.error('Failed to add product:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add product');
      throw err;
    }
  };

  const handleUpdateProduct = async (productData: Product) => {
    if (!productDialog.product?._id) return;

    try {
      const response = await fetch(`/api/products/category-products/${productDialog.product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update product');
      }

      await fetchCategories();
      toast.success('Product updated successfully');
    } catch (err) {
      console.error('Failed to update product:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update product');
      throw err;
    }
  };

  const handleDeleteProduct = async () => {
    try {
      const response = await fetch(`/api/products/category-products/${deleteDialog.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete product');
      }

      await fetchCategories();
      toast.success('Product deleted successfully');
      setDeleteDialog({ open: false, type: 'product', id: '', name: '' });
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/category-products/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, available: !product.available }),
      });

      if (!response.ok) throw new Error('Failed to update product');

      await fetchCategories();
      toast.success(`Product is now ${!product.available ? 'available' : 'unavailable'}`);
    } catch (err) {
      console.error('Failed to update product:', err);
      toast.error('Failed to update product status');
    }
  };

  // Formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // Get inventory item name
  const getInventoryItemName = (id?: string) => {
    if (!id) return 'Unknown Item';
    const item = inventoryItems.find(i => i._id === id);
    return item?.name || 'Unknown Item';
  };

  // Filter categories by menu type
  const foodCategories = categories.filter(c => c.menuType === 'food');
  const drinkCategories = categories.filter(c => c.menuType === 'drink');

  // Calculate stats
  const totalProducts = categories.reduce((sum, cat) => sum + (cat.products?.length || 0), 0);
  const activeProducts = categories.reduce(
    (sum, cat) => sum + (cat.products?.filter(p => p.available).length || 0),
    0
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Dialogs */}
      <CategoryDialog
        open={categoryDialog.open}
        onOpenChange={(open) => setCategoryDialog({ open })}
        onSubmit={handleAddCategory}
        initialData={categoryDialog.category}
      />

      <ProductDialog
        open={productDialog.open}
        onOpenChange={(open) => setProductDialog({ open, category: productDialog.category })}
        category={productDialog.category}
        product={productDialog.product}
        inventoryItems={inventoryItems}
        inventoryLoading={inventoryLoading}
        onSubmit={productDialog.product ? handleUpdateProduct : handleAddProduct}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteDialog.type === 'category' ? 'Category' : 'Product'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === 'category' ? (
                <>
                  Are you sure you want to delete <span className="font-semibold">"{deleteDialog.name}"</span>?
                  <br />
                  This will permanently delete the category and ALL products within it.
                </>
              ) : (
                <>
                  Are you sure you want to delete <span className="font-semibold">"{deleteDialog.name}"</span>?
                  <br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteDialog.type === 'category' ? handleDeleteCategory : handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage food and drink categories with inventory integration
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            fetchCategories();
            fetchInventoryItems();
            toast.info('Refreshing data...');
          }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setCategoryDialog({ open: true })}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Categories"
          value={categories.length}
          icon={Package}
          description={`${foodCategories.length} food, ${drinkCategories.length} drink`}
        />
        <StatsCard
          title="Food Categories"
          value={foodCategories.length}
          icon={Utensils}
        />
        <StatsCard
          title="Drink Categories"
          value={drinkCategories.length}
          icon={Coffee}
        />
        <StatsCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          description={`${activeProducts} active`}
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MenuType)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="food" className="gap-2">
            <Utensils className="h-4 w-4" />
            Food
          </TabsTrigger>
          <TabsTrigger value="drink" className="gap-2">
            <Coffee className="h-4 w-4" />
            Drink
          </TabsTrigger>
        </TabsList>

        <TabsContent value="food" className="space-y-4">
          {renderCategories(foodCategories, 'food')}
        </TabsContent>

        <TabsContent value="drink" className="space-y-4">
          {renderCategories(drinkCategories, 'drink')}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderCategories(categoriesList: Category[], type: MenuType) {
    if (loading && !categoriesList.length) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (categoriesList.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No {type} categories yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first {type} category to get started
            </p>
            <Button onClick={() => setCategoryDialog({ open: true })}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      );
    }

    return categoriesList.map((category) => (
      <Card key={category._id} className="overflow-hidden">
        <CardHeader className="bg-muted/50">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {category.name}
                <Badge variant="outline">
                  {category.menuType === 'food' ? (
                    <Utensils className="mr-1 h-3 w-3" />
                  ) : (
                    <Coffee className="mr-1 h-3 w-3" />
                  )}
                  {category.menuType}
                </Badge>
              </CardTitle>
              {category.description && (
                <CardDescription className="mt-1">{category.description}</CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setProductDialog({ open: true, category })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteDialog({
                    open: true,
                    type: 'category',
                    id: category._id!,
                    name: category.name,
                  })}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {category.products?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-sm text-muted-foreground mb-2">No products in this category</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProductDialog({ open: true, category })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add First Product
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ingredients</TableHead>
                  <TableHead className="w-25">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {category.products?.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div className="flex items-center gap-3"> {/* ← wrap in flex */}
                        {/* Thumbnail */}
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-10 w-10 rounded-md object-cover border flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground">{product.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleToggleAvailability(product)}
                      >
                        {product.available ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                            Active
                          </>
                        ) : (
                          <>
                            <AlertCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                            Inactive
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-50">
                        {product.ingredients.length > 0 ? (
                          <div className="space-y-1">
                            {product.ingredients.slice(0, 2).map((ing, idx) => (
                              <div key={idx} className="truncate">
                                {getInventoryItemName(ing.inventoryItemId)}: {ing.quantity} {ing.unit}
                              </div>
                            ))}
                            {product.ingredients.length > 2 && (
                              <div className="text-xs">+{product.ingredients.length - 2} more</div>
                            )}
                          </div>
                        ) : (
                          <span className="italic">No ingredients</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setProductDialog({
                            open: true,
                            category,
                            product,
                          })}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteDialog({
                            open: true,
                            type: 'product',
                            id: product._id!,
                            name: product.name,
                            categoryId: category._id,
                          })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {category.products && category.products.length > 0 && (
          <div className="border-t px-6 py-3 bg-muted/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProductDialog({ open: true, category })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        )}
      </Card>
    ));
  }
}