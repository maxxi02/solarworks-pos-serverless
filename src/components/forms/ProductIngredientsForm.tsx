'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Package, 
  AlertCircle,
  Loader2,
  X,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  Unit,
  UnitCategory,
  getUnitCategory,
  isValidUnit,
  getCompatibleUnits, // ✅ Now this exists
  getCompatibleUnitsForUnit,
  formatQuantity,
  normalizeToBaseUnit,
  getBaseUnit,
  areUnitsCompatible,
  hasDensity,
  ingredientDensities,
  convertUnit
} from '@/lib/unit-conversion';

// Types
export interface ProductIngredient {
  inventoryItemId: string;     // Link to inventory item
  name: string;               // Ingredient name (from inventory)
  quantity: number;           // Quantity in recipe unit
  unit: Unit;                // Recipe unit (tsp, g, etc)
  baseQuantity?: number;     // Normalized quantity in base unit (g, mL, pieces, cm)
  baseUnit?: Unit;          // Base unit from inventory
  displayQuantity?: number;  // Formatted quantity for display
  displayUnit?: Unit;       // Display unit
  conversionNote?: string;  // Human-readable conversion explanation
}

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: Unit;              // Base unit (g, mL, pieces, cm)
  displayUnit: Unit;       // Display unit (kg, L, tsp, etc)
  unitCategory: UnitCategory;
  density?: number;
  pricePerUnit: number;
  supplier?: string;
  status: string;
  currentStockDisplay?: string;
}

interface ProductIngredientsFormProps {
  inventoryItems: InventoryItem[];
  onIngredientsChange: (ingredients: ProductIngredient[]) => void;
  initialIngredients?: ProductIngredient[];
  loading?: boolean;
}

// Common units for dropdown - organized by category
const COMMON_UNITS: Record<UnitCategory, readonly Unit[]> = {
  weight: ['g', 'kg', 'oz', 'lb'],
  volume: ['mL', 'L', 'tsp', 'tbsp', 'cup', 'fl_oz'],
  count: ['pieces', 'boxes', 'bottles', 'bags', 'packs'],
  length: ['cm', 'm', 'inch']
};

// Flatten for dropdown
const ALL_COMMON_UNITS: Unit[] = [
  ...COMMON_UNITS.weight,
  ...COMMON_UNITS.volume,
  ...COMMON_UNITS.count,
  ...COMMON_UNITS.length
];

export function ProductIngredientsForm({
  inventoryItems,
  onIngredientsChange,
  initialIngredients = [],
  loading = false
}: ProductIngredientsFormProps) {
  // State
  const [ingredients, setIngredients] = useState<ProductIngredient[]>(initialIngredients);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('g');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [expandedIngredients, setExpandedIngredients] = useState<Record<string, boolean>>({});

  // Filter inventory items based on search
  const filteredItems = inventoryItems.filter(item => {
    if (!item) return false;
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.supplier?.toLowerCase().includes(query)
    );
  });

  // Initialize with selected item
  useEffect(() => {
    if (selectedItem) {
      // Set default unit to the item's display unit
      setUnit(selectedItem.displayUnit || selectedItem.unit);
    }
  }, [selectedItem]);

  // Calculate total cost of ingredients
  const calculateTotalCost = useCallback(() => {
    return ingredients.reduce((total, ingredient) => {
      const inventoryItem = inventoryItems.find(item => item._id === ingredient.inventoryItemId);
      if (inventoryItem) {
        // Use base quantity if available, otherwise convert
        const baseQuantity = ingredient.baseQuantity || convertQuantity(
          ingredient.quantity,
          ingredient.unit,
          inventoryItem.unit,
          inventoryItem.name,
          inventoryItem.density
        );
        return total + (baseQuantity * inventoryItem.pricePerUnit);
      }
      return total;
    }, 0);
  }, [ingredients, inventoryItems]);

  // Convert quantity between units with density support
  const convertQuantity = (
    quantity: number,
    fromUnit: Unit,
    toUnit: Unit,
    ingredientName?: string,
    density?: number
  ): number => {
    try {
      // If units are the same, no conversion needed
      if (fromUnit === toUnit) return quantity;
      
      // Check if units are compatible
      if (!areUnitsCompatible(fromUnit, toUnit)) {
        const fromCategory = getUnitCategory(fromUnit);
        const toCategory = getUnitCategory(toUnit);
        
        // If converting between weight and volume, check for density
        if ((fromCategory === 'weight' && toCategory === 'volume') ||
            (fromCategory === 'volume' && toCategory === 'weight')) {
          
          // Use provided density or check global density lookup
          const densityValue = density || (ingredientName ? hasDensity(ingredientName) ? 
            ingredientDensities[ingredientName.toLowerCase()] : undefined : undefined);
          
          if (!densityValue) {
            toast.error(`Cannot convert ${fromUnit} to ${toUnit}`, {
              description: `No density data for ${ingredientName || 'this ingredient'}`
            });
            return quantity;
          }
          
          // Weight to volume: g -> mL
          if (fromCategory === 'weight' && toCategory === 'volume') {
            const grams = convertQuantity(quantity, fromUnit, 'g');
            const ml = grams / densityValue;
            return convertQuantity(ml, 'mL', toUnit);
          }
          
          // Volume to weight: mL -> g
          if (fromCategory === 'volume' && toCategory === 'weight') {
            const ml = convertQuantity(quantity, fromUnit, 'mL');
            const grams = ml * densityValue;
            return convertQuantity(grams, 'g', toUnit);
          }
        }
        
        // If we can't convert, return original quantity and warn
        console.warn(`Cannot convert ${fromUnit} to ${toUnit}: different categories`);
        return quantity;
      }
      
      // Same category conversion
      // Normalize to base unit first, then convert
      const normalized = normalizeToBaseUnit(quantity, fromUnit);
      const normalizedQuantity = normalized.quantity;
      const baseUnit = normalized.unit as Unit;
      
      // Convert from base unit to target unit
      return convertUnit(normalizedQuantity, baseUnit, toUnit);
      
    } catch (error) {
      console.error('Conversion error:', error);
      return quantity;
    }
  };

  // Normalize ingredient to base unit
  const normalizeIngredient = (
    ingredient: ProductIngredient,
    inventoryItem: InventoryItem
  ): ProductIngredient => {
    try {
      const baseQuantity = convertQuantity(
        ingredient.quantity,
        ingredient.unit,
        inventoryItem.unit,
        inventoryItem.name,
        inventoryItem.density
      );
      
      const formattedBaseQuantity = formatQuantity(baseQuantity, inventoryItem.unit);
      
      // Create conversion note
      let conversionNote: string | undefined;
      if (ingredient.unit !== inventoryItem.unit) {
        conversionNote = `${ingredient.quantity} ${ingredient.unit} = ${formattedBaseQuantity} ${inventoryItem.unit}`;
      }
      
      return {
        ...ingredient,
        baseQuantity: formattedBaseQuantity,
        baseUnit: inventoryItem.unit,
        displayQuantity: ingredient.quantity,
        displayUnit: ingredient.unit,
        conversionNote
      };
    } catch (error) {
      console.error('Failed to normalize ingredient:', error);
      return ingredient;
    }
  };

  // Handle adding ingredient
  const handleAddIngredient = () => {
    if (!selectedItem || !quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      toast.error('Please select an inventory item and enter a valid quantity');
      return;
    }

    const quantityNum = Number(quantity);
    
    // Validate unit
    if (!isValidUnit(unit)) {
      toast.error('Invalid unit', {
        description: `"${unit}" is not a valid unit`
      });
      return;
    }
    
    // Create new ingredient
    const newIngredient: ProductIngredient = {
      inventoryItemId: selectedItem._id,
      name: selectedItem.name,
      quantity: quantityNum,
      unit: unit
    };
    
    // Normalize to base unit
    const normalizedIngredient = normalizeIngredient(newIngredient, selectedItem);
    
    // Check if ingredient already exists
    const existingIndex = ingredients.findIndex(
      ing => ing.inventoryItemId === selectedItem._id
    );

    let newIngredients: ProductIngredient[];
    
    if (existingIndex >= 0) {
      // Update existing ingredient - add quantities
      const existing = ingredients[existingIndex];
      const updatedIngredient: ProductIngredient = {
        ...existing,
        quantity: existing.quantity + quantityNum,
        unit: unit // Use new unit
      };
      
      // Re-normalize
      const renormalized = normalizeIngredient(updatedIngredient, selectedItem);
      
      newIngredients = [...ingredients];
      newIngredients[existingIndex] = renormalized;
      
      toast.info(`Updated quantity for ${selectedItem.name}`, {
        description: renormalized.conversionNote
      });
    } else {
      // Add new ingredient
      newIngredients = [...ingredients, normalizedIngredient];
      toast.success(`Added ${selectedItem.name} to recipe`, {
        description: normalizedIngredient.conversionNote
      });
    }

    setIngredients(newIngredients);
    onIngredientsChange(newIngredients);
    
    // Reset form
    setSelectedItem(null);
    setQuantity('');
    setUnit('g');
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Handle removing ingredient
  const handleRemoveIngredient = (index: number) => {
    const ingredient = ingredients[index];
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
    onIngredientsChange(newIngredients);
    toast.info(`Removed ${ingredient.name} from recipe`);
  };

  // Handle quantity change for existing ingredient
  const handleQuantityChange = (index: number, newQuantity: string) => {
    const numQuantity = Number(newQuantity);
    if (isNaN(numQuantity) || numQuantity <= 0) return;

    const newIngredients = [...ingredients];
    const ingredient = newIngredients[index];
    const inventoryItem = inventoryItems.find(item => item._id === ingredient.inventoryItemId);
    
    if (inventoryItem) {
      ingredient.quantity = numQuantity;
      const normalized = normalizeIngredient(ingredient, inventoryItem);
      newIngredients[index] = normalized;
      
      setIngredients(newIngredients);
      onIngredientsChange(newIngredients);
      
      toast.info(`Updated quantity for ${ingredient.name}`, {
        description: normalized.conversionNote
      });
    }
  };

  // Handle unit change for existing ingredient
  const handleUnitChange = (index: number, newUnit: string) => {
    if (!isValidUnit(newUnit)) {
      toast.error(`Invalid unit: ${newUnit}`);
      return;
    }

    const newIngredients = [...ingredients];
    const ingredient = newIngredients[index];
    const inventoryItem = inventoryItems.find(item => item._id === ingredient.inventoryItemId);
    
    if (inventoryItem) {
      ingredient.unit = newUnit as Unit;
      const normalized = normalizeIngredient(ingredient, inventoryItem);
      newIngredients[index] = normalized;
      
      setIngredients(newIngredients);
      onIngredientsChange(newIngredients);
      
      toast.info(`Updated unit for ${ingredient.name}`, {
        description: normalized.conversionNote
      });
    }
  };

  // Toggle ingredient details
  const toggleIngredientDetails = (ingredientId: string) => {
    setExpandedIngredients(prev => ({
      ...prev,
      [ingredientId]: !prev[ingredientId]
    }));
  };

  // Get inventory item by ID
  const getInventoryItem = (inventoryItemId: string): InventoryItem | undefined => {
    return inventoryItems.find(item => item._id === inventoryItemId);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'low': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'ok': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Calculate required stock vs available
  const calculateStockRequirement = (ingredient: ProductIngredient) => {
    const inventoryItem = getInventoryItem(ingredient.inventoryItemId);
    if (!inventoryItem) return { sufficient: false, required: 0, available: 0, unit: '' };
    
    // Use base quantity if available
    const required = ingredient.baseQuantity || convertQuantity(
      ingredient.quantity,
      ingredient.unit,
      inventoryItem.unit,
      inventoryItem.name,
      inventoryItem.density
    );
    
    const sufficient = inventoryItem.currentStock >= required;
    
    return {
      sufficient,
      required: formatQuantity(required, inventoryItem.unit),
      available: inventoryItem.currentStock,
      unit: inventoryItem.unit,
      displayRequired: ingredient.displayQuantity || ingredient.quantity,
      displayUnit: ingredient.displayUnit || ingredient.unit
    };
  };

  // Get compatible units for selected item
  const getCompatibleUnitsForSelected = useCallback((): Unit[] => {
    if (!selectedItem) return ALL_COMMON_UNITS;
    return getCompatibleUnits(selectedItem.unitCategory);
  }, [selectedItem]);

  // Total cost
  const totalCost = calculateTotalCost();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Recipe Ingredients
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add ingredients from inventory. When this product is sold, inventory will be automatically deducted.
          <span className="block mt-1 text-xs text-blue-600 dark:text-blue-500">
            Units will be automatically converted based on inventory settings.
          </span>
        </p>
      </div>

      {/* Add Ingredient Form */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Add Ingredient</h4>
        
        {/* Search Inventory */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search Inventory
          </label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Search by name, category, or supplier..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                disabled={isLoadingInventory}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedItem(null);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Search Results */}
            {showSearchResults && searchQuery && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {isLoadingInventory ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-500" />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    No inventory items found
                  </div>
                ) : (
                  filteredItems.map(item => (
                    <div
                      key={item._id}
                      className={`p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer ${
                        selectedItem?._id === item._id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => {
                        setSelectedItem(item);
                        setUnit(item.displayUnit || item.unit);
                        setShowSearchResults(false);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                              {item.category}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          {item.supplier && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Supplier: {item.supplier}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {item.currentStockDisplay || `${item.currentStock} ${item.displayUnit || item.unit}`}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            ₱{item.pricePerUnit.toFixed(2)}/{item.displayUnit || item.unit}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Item Info */}
        {selectedItem && (
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-900/30">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium text-gray-900 dark:text-white">{selectedItem.name}</div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Available:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {selectedItem.currentStockDisplay || `${selectedItem.currentStock} ${selectedItem.displayUnit || selectedItem.unit}`}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Price:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  ₱{selectedItem.pricePerUnit.toFixed(2)}/{selectedItem.displayUnit || selectedItem.unit}
                </span>
              </div>
            </div>
            {selectedItem.density && (
              <div className="mt-1 text-xs text-blue-600 dark:text-blue-500">
                Density: {selectedItem.density} g/mL (supports weight/volume conversion)
              </div>
            )}
          </div>
        )}

        {/* Quantity Input */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantity Required *
            </label>
            <div className="flex">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
                placeholder="0.00"
                disabled={!selectedItem}
              />
              <div className="rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 min-w-25">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {unit || selectedItem?.displayUnit || selectedItem?.unit || 'unit'}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unit *
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
              disabled={!selectedItem}
            >
              <option value="">Select unit</option>
              {getCompatibleUnitsForSelected().map((unitOption) => (
                <option key={unitOption} value={unitOption}>
                  {unitOption}
                </option>
              ))}
            </select>
            {selectedItem && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Compatible units: {getCompatibleUnits(selectedItem.unitCategory).join(', ')}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleAddIngredient}
          disabled={!selectedItem || !quantity || isNaN(Number(quantity)) || Number(quantity) <= 0}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 dark:bg-blue-700 text-white py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-4 w-4" />
          {selectedItem && ingredients.some(ing => ing.inventoryItemId === selectedItem._id) 
            ? 'Update Quantity' 
            : 'Add to Recipe'}
        </button>
      </div>

      {/* Current Ingredients List */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Recipe Ingredients ({ingredients.length})
          </h4>
          {ingredients.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Cost: <span className="font-medium text-green-600 dark:text-green-500">
                ₱{totalCost.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        
        {ingredients.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <Package className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No ingredients added yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Add ingredients to connect with inventory
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ingredients.map((ingredient, index) => {
              const inventoryItem = getInventoryItem(ingredient.inventoryItemId);
              const stockReq = calculateStockRequirement(ingredient);
              const isExpanded = expandedIngredients[ingredient.inventoryItemId];
              
              return (
                <div 
                  key={`${ingredient.inventoryItemId}-${index}`} 
                  className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
                >
                  {/* Ingredient Header */}
                  <div 
                    className="p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => toggleIngredientDetails(ingredient.inventoryItemId)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {ingredient.name}
                          </div>
                          {!stockReq.sufficient && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                              Insufficient Stock
                            </span>
                          )}
                          {ingredient.conversionNote && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              Converted
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {ingredient.displayQuantity || ingredient.quantity} {ingredient.displayUnit || ingredient.unit} per serving
                          {ingredient.conversionNote && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-500">
                              ({ingredient.conversionNote})
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Stock Indicator */}
                        {inventoryItem && (
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            stockReq.sufficient 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {stockReq.available.toFixed(2)}/{stockReq.required.toFixed(2)} {stockReq.unit}
                          </div>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveIngredient(index);
                          }}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                          title="Remove ingredient"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && inventoryItem && (
                    <div className="p-3 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Quantity
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={ingredient.quantity}
                              onChange={(e) => handleQuantityChange(index, e.target.value)}
                              className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-black"
                            />
                            <select
                              value={ingredient.unit}
                              onChange={(e) => handleUnitChange(index, e.target.value)}
                              className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-black"
                            >
                              {getCompatibleUnits(inventoryItem.unitCategory).map((unitOption) => (
                                <option key={unitOption} value={unitOption}>{unitOption}</option>
                              ))}
                            </select>
                          </div>
                          {ingredient.conversionNote && (
                            <p className="mt-1 text-xs text-blue-600 dark:text-blue-500">
                              {ingredient.conversionNote}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Inventory Status
                          </label>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Available:</span>
                              <span className="font-medium">{inventoryItem.currentStock} {inventoryItem.unit}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Required:</span>
                              <span className="font-medium">
                                {stockReq.required.toFixed(2)} {inventoryItem.unit}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Remaining:</span>
                              <span className={`font-medium ${
                                stockReq.sufficient ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                              }`}>
                                {(inventoryItem.currentStock - stockReq.required).toFixed(2)} {inventoryItem.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>Cost per serving:</span>
                            <span className="font-medium text-green-600 dark:text-green-500">
                              ₱{(stockReq.required * inventoryItem.pricePerUnit).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span>Inventory Item Price:</span>
                            <span>₱{inventoryItem.pricePerUnit.toFixed(2)}/{inventoryItem.displayUnit || inventoryItem.unit}</span>
                          </div>
                          {inventoryItem.density && (
                            <div className="flex justify-between mt-1 text-blue-600 dark:text-blue-500">
                              <span>Density:</span>
                              <span>{inventoryItem.density} g/mL</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Recipe Summary */}
            {ingredients.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-900/30">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-800 dark:text-blue-400">Recipe Summary</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      This recipe contains {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}. 
                      When sold, inventory will be automatically deducted based on these quantities.
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Total Ingredients</div>
                    <div className="font-medium text-blue-800 dark:text-blue-300">{ingredients.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Estimated Cost</div>
                    <div className="font-medium text-green-600 dark:text-green-500">₱{totalCost.toFixed(2)}</div>
                  </div>
                </div>
                
                {/* Stock Warning */}
                {ingredients.some(ing => {
                  const stockReq = calculateStockRequirement(ing);
                  return !stockReq.sufficient;
                }) && (
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-900/30">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5" />
                      <div className="text-xs text-red-700 dark:text-red-400">
                        Some ingredients have insufficient stock. You may need to restock before selling.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Loading State */}
      {(loading || isLoadingInventory) && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-500 mr-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isLoadingInventory ? 'Loading inventory...' : 'Saving...'}
          </span>
        </div>
      )}
    </div>
  );
}