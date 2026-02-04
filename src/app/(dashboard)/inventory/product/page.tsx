'use client';

import { useState } from 'react';
import { Coffee, Utensils, } from 'lucide-react';

// Product type
interface Product {
  id: string;
  name: string;
  price: number;
  variants?: { name: string; price: number }[];
  description?: string;
}

// Category type
interface Category {
  id: string;
  name: string;
  icon: 'coffee' | 'utensils';
  products: Product[];
}

// Products data from the menu images
const categories: Category[] = [
  {
    id: 'espresso',
    name: 'Espresso',
    icon: 'coffee',
    products: [
      { id: 'iced-coffee-jelly', name: 'Iced Coffee Jelly', price: 170 },
      { id: 'oat-latte', name: 'Oat Latte', price: 170 },
      { id: 'sea-salt-brew', name: 'Sea Salt Brew', price: 169 },
      { id: 'rendezvous-speciale', name: 'Rendezvous Speciale', price: 159 },
      { id: 'caramel-macchiato', name: 'Caramel Macchiato', price: 159 },
      { id: 'white-mocha', name: 'White Mocha', price: 159 },
      { id: 'spanish-latte', name: 'Spanish Latte', price: 150 },
      { id: 'hazelnut-brew', name: 'Hazelnut Brew', price: 149 },
      { id: 'americano', name: 'Americano', price: 99 },
    ],
  },
  {
    id: 'refreshers',
    name: 'Refreshers',
    icon: 'coffee',
    products: [
      { id: 'luscious-lychee', name: 'Luscious Lychee', price: 140 },
      { id: 'peach-perfect', name: 'Peach Perfect', price: 140 },
      { id: 'temple-twist-soda', name: 'Temple Twist Soda', price: 140 },
    ],
  },
  {
    id: 'specials',
    name: 'Specials',
    icon: 'coffee',
    products: [
      { id: 'matcha-sea-foam', name: 'Matcha Sea Foam', price: 179 },
      { id: 'strawberry-matcha-latte', name: 'Strawberry Matcha Latte', price: 169 },
      { id: 'strawberry-cream-pop', name: 'Strawberry Cream Pop', price: 130 },
      { id: 'mango-cream-pop', name: 'Mango Cream Pop', price: 130 },
      { id: 'matcha-latte', name: 'Matcha Latte', price: 150 },
      { id: 'signature-chocolate', name: 'Signature Chocolate', price: 130 },
    ],
  },
  {
    id: 'frappe',
    name: 'Frappe',
    icon: 'coffee',
    products: [
      { id: 'french-vanilla-oreo', name: 'French Vanilla Oreo', price: 190 },
      { id: 'coffee-jelly', name: 'Coffee Jelly', price: 170 },
      { id: 'ultimate-mocha', name: 'Ultimate Mocha', price: 170 },
      { id: 'strawberry-cream', name: 'Strawberry Cream', price: 170 },
      { id: 'mango-cream', name: 'Mango Cream', price: 170 },
    ],
  },
  {
    id: 'breakfast',
    name: 'All Day Breakfast',
    icon: 'utensils',
    products: [
      { id: 'jumbo-hungarian-susilog', name: 'Jumbo! Hungarian Susilog', price: 195 },
      { id: 'special-taal-tapsilog', name: 'Special Taal Tapsilog', price: 195 },
      { id: 'crispy-chicksilog', name: 'Crispy Chicksilog', price: 185 },
      { id: 'old-time-spamsilog', name: 'Old Time Spamsilog', price: 175 },
    ],
  },
  {
    id: 'snacks',
    name: 'Snack Attack',
    icon: 'utensils',
    products: [
      { id: 'beef-burger-fries', name: 'Juicy Beef Burger & Fries', price: 215, variants: [{ name: 'Solo', price: 215 }, { name: 'Barkada', price: 265 }] },
      { id: 'chicken-burger-fries', name: 'Crispy Chicken Burger & Fries', price: 185, variants: [{ name: 'Solo', price: 185 }, { name: 'Barkada', price: 265 }] },
      { id: 'chicken-fingers-fries', name: 'Crispy Chicken Fingers & Fries', price: 150, variants: [{ name: 'Solo', price: 150 }, { name: 'Barkada', price: 265 }] },
      { id: 'calamari-rings', name: 'Calamari Rings', price: 145, variants: [{ name: 'Solo', price: 145 }, { name: 'Barkada', price: 285 }] },
      { id: 'classic-veggie-lumpia', name: 'Classic Veggie Lumpia', price: 140, variants: [{ name: 'Solo', price: 140 }, { name: 'Barkada', price: 260 }] },
      { id: 'basket-of-fries', name: 'Basket of Fries', price: 125, variants: [{ name: 'Solo', price: 125 }, { name: 'Barkada', price: 265 }] },
      { id: 'balls-balls-balls', name: 'Balls, Balls, Balls', price: 115, variants: [{ name: 'Solo', price: 115 }, { name: 'Barkada', price: 260 }] },
    ],
  },
  {
    id: 'pasta',
    name: 'Pasta',
    icon: 'utensils',
    products: [
      { id: 'carbonara-fettuccine', name: 'Carbonara Fettuccine', price: 285 },
    ],
  },
  {
    id: 'breads-pastries',
    name: 'Breads + Pastries',
    icon: 'utensils',
    products: [
      { id: 'blueberry-muffin', name: 'Blueberry Muffin', price: 150 },
      { id: 'red-velvet-muffin', name: 'Red Velvet Muffin', price: 150 },
      { id: 'chocolate-muffin', name: 'Chocolate Muffin', price: 150 },
      { id: 'pain-au-chocolat', name: 'Pain Au Chocolat', price: 135 },
      { id: 'golden-croissant', name: 'Golden Croissant', price: 99 },
    ],
  },
  {
    id: 'sweet-tooth',
    name: 'Sweet Tooth',
    icon: 'utensils',
    products: [
      { id: 'red-velvet-cake', name: 'Red Velvet Cake', price: 175 },
      { id: 'biscoff-croffle', name: 'Biscoff/Strawberry/Blueberry Croffle', price: 170 },
    ],
  },
];

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);

  const currentCategory = categories.find(cat => cat.id === activeCategory);

  return (
    <div className="min-h-screen bg-background">

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title - Matched to dashboard style */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Products
          </h2>
          <p className="text-muted-foreground">
            Browse and manage all available products from our menu.
          </p>
        </div>

        {/* Category Tabs - Black and white style */}
        <div className="mb-8 border-b border-border">
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px ${
                  activeCategory === category.id
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {category.icon === 'coffee' ? (
                  <Coffee className="h-4 w-4" />
                ) : (
                  <Utensils className="h-4 w-4" />
                )}
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {currentCategory && (
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-6">
              {currentCategory.name}
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentCategory.products.map(product => (
                <div
                  key={product.id}
                  className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md"
                >
                  <h4 className="font-semibold text-foreground mb-2">{product.name}</h4>

                  {/* Pricing */}
                  <div className="mb-4">
                    {product.variants && product.variants.length > 0 ? (
                      <div className="space-y-1">
                        {product.variants.map((variant, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{variant.name}</span>
                            <span className="font-semibold text-foreground">₱{variant.price.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-lg font-semibold text-foreground">₱{product.price.toLocaleString()}</div>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-4">{product.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons Section */}
        <div className="mt-12">
          <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Add-Ons</h3>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
                <span className="font-medium text-foreground">Oat/Coconut Milk</span>
                <span className="font-semibold text-foreground">+₱40</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
                <span className="font-medium text-foreground">Coffee Jelly</span>
                <span className="font-semibold text-foreground">+₱30</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
                <span className="font-medium text-foreground">Extra Shot</span>
                <span className="font-semibold text-foreground">+₱30</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}