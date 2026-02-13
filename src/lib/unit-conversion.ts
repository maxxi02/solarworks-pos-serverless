// Unit categories - prevents invalid conversions between different types
export const unitCategories = {
  weight: ['kg', 'g', 'mg', 'lb', 'oz'] as const,
  volume: ['L', 'mL', 'tsp', 'tbsp', 'cup', 'fl_oz', 'gal', 'qt', 'pt'] as const,
  count: ['pieces', 'pcs', 'box', 'boxes', 'bottle', 'bottles', 'bag', 'bags', 'pack', 'packs', 'can', 'cans'] as const,
  length: ['m', 'cm', 'mm', 'inch', 'in', 'ft'] as const
} as const;

export type UnitCategory = keyof typeof unitCategories;
export type WeightUnit = typeof unitCategories.weight[number];
export type VolumeUnit = typeof unitCategories.volume[number];
export type CountUnit = typeof unitCategories.count[number];
export type LengthUnit = typeof unitCategories.length[number];
export type Unit = WeightUnit | VolumeUnit | CountUnit | LengthUnit;

// ============================================================================
// WEIGHT CONVERSIONS - All to grams (g)
// ============================================================================
export const weightConversions: Record<WeightUnit, number> = {
  // Metric
  'kg': 1000,      // 1 kg = 1000 g
  'g': 1,          // base unit
  'mg': 0.001,     // 1 mg = 0.001 g
  
  // Imperial
  'lb': 453.59237, // 1 lb = 453.59237 g
  'oz': 28.349523  // 1 oz = 28.349523 g
};

// ============================================================================
// VOLUME CONVERSIONS - All to milliliters (mL)
// ============================================================================
export const volumeConversions: Record<VolumeUnit, number> = {
  // Metric
  'L': 1000,       // 1 L = 1000 mL
  'mL': 1,         // base unit
  
  // US Customary
  'tsp': 4.92892,  // 1 tsp = 4.92892 mL
  'tbsp': 14.7868, // 1 tbsp = 14.7868 mL
  'cup': 236.588,  // 1 cup = 236.588 mL
  'fl_oz': 29.5735, // 1 fl oz = 29.5735 mL
  'gal': 3785.41,  // 1 gal = 3785.41 mL
  'qt': 946.353,   // 1 qt = 946.353 mL
  'pt': 473.176    // 1 pt = 473.176 mL
};

// ============================================================================
// COUNT CONVERSIONS - All to pieces
// ============================================================================
export const countConversions: Record<CountUnit, number> = {
  'pieces': 1,
  'pcs': 1,
  'box': 1,
  'boxes': 1,
  'bottle': 1,
  'bottles': 1,
  'bag': 1,
  'bags': 1,
  'pack': 1,
  'packs': 1,
  'can': 1,
  'cans': 1
};

// ============================================================================
// LENGTH CONVERSIONS - All to centimeters (cm)
// ============================================================================
export const lengthConversions: Record<LengthUnit, number> = {
  // Metric
  'm': 100,        // 1 m = 100 cm
  'cm': 1,         // base unit
  'mm': 0.1,       // 1 mm = 0.1 cm
  
  // Imperial
  'inch': 2.54,    // 1 inch = 2.54 cm
  'in': 2.54,      // 1 in = 2.54 cm
  'ft': 30.48      // 1 ft = 30.48 cm
};

// ============================================================================
// DENSITY LOOKUP - For weight <-> volume conversions
// ============================================================================
// Density in g/mL (grams per milliliter)
export const ingredientDensities: Record<string, number> = {
  // Baking ingredients
  'sugar': 0.85,
  'granulated sugar': 0.85,
  'brown sugar': 0.80,
  'powdered sugar': 0.56,
  'flour': 0.59,
  'all-purpose flour': 0.59,
  'bread flour': 0.57,
  'cake flour': 0.53,
  'cornstarch': 0.53,
  
  // Liquids
  'water': 1.00,
  'milk': 1.03,
  'cream': 1.00,
  'half and half': 1.02,
  'oil': 0.92,
  'vegetable oil': 0.92,
  'olive oil': 0.92,
  'coconut oil': 0.92,
  'honey': 1.42,
  'maple syrup': 1.33,
  'corn syrup': 1.38,
  
  // Dairy
  'butter': 0.91,
  'yogurt': 1.04,
  'sour cream': 0.99,
  
  // Other
  'salt': 1.20,
  'table salt': 1.20,
  'kosher salt': 0.50,
  'sea salt': 1.20,
  'baking soda': 0.92,
  'baking powder': 0.72,
  'yeast': 0.95,
  'cocoa powder': 0.53,
  'chocolate chips': 0.64,
  
  // Coffee specific
  'coffee beans': 0.43,
  'ground coffee': 0.38,
  'espresso': 1.04,
  'syrup': 1.33,
  'caramel syrup': 1.33,
  'vanilla syrup': 1.33,
  'chocolate syrup': 1.33,
  
  // Jelly/Dessert
  'gelatin powder': 0.86,
  'agar agar': 0.80,
  'jelly powder': 0.85,
  'pudding mix': 0.70
};

// ============================================================================
// UNIT CATEGORY UTILITIES
// ============================================================================

/**
 * Get the category of a unit
 * @returns 'weight', 'volume', 'count', 'length', or null if unknown
 */
export function getUnitCategory(unit: string): UnitCategory | null {
  if (unit in weightConversions) return 'weight';
  if (unit in volumeConversions) return 'volume';
  if (unit in countConversions) return 'count';
  if (unit in lengthConversions) return 'length';
  return null;
}

/**
 * Check if two units are compatible (same category)
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const category1 = getUnitCategory(unit1);
  const category2 = getUnitCategory(unit2);
  
  if (!category1 || !category2) return false;
  return category1 === category2;
}

/**
 * Check if a unit is a weight unit
 */
export function isWeightUnit(unit: string): boolean {
  return unit in weightConversions;
}

/**
 * Check if a unit is a volume unit
 */
export function isVolumeUnit(unit: string): boolean {
  return unit in volumeConversions;
}

/**
 * Check if a unit is a count unit
 */
export function isCountUnit(unit: string): boolean {
  return unit in countConversions;
}

/**
 * Check if a unit is a length unit
 */
export function isLengthUnit(unit: string): boolean {
  return unit in lengthConversions;
}

// ============================================================================
// CONVERSION FUNCTIONS - Within Same Category
// ============================================================================

/**
 * Convert between units in the SAME category
 * @throws Error if units are in different categories
 */
export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number {
  // Add safety check for undefined units
  if (!fromUnit || !toUnit) {
    console.warn(`convertUnit called with undefined unit: fromUnit=${fromUnit}, toUnit=${toUnit}`);
    return quantity;
  }
  
  if (quantity === 0) return 0;
  
  const category = getUnitCategory(fromUnit);
  const toCategory = getUnitCategory(toUnit);
  
  if (!category || !toCategory) {
    throw new Error(`Unknown unit: ${!category ? fromUnit : toUnit}`);
  }
  
  if (category !== toCategory) {
    throw new Error(
      `Cannot convert ${fromUnit} (${category}) to ${toUnit} (${toCategory}). ` +
      `Units must be in the same category.`
    );
  }
  
  // Convert within the same category
  switch (category) {
    case 'weight':
      const grams = quantity * weightConversions[fromUnit as WeightUnit];
      return grams / weightConversions[toUnit as WeightUnit];
      
    case 'volume':
      const ml = quantity * volumeConversions[fromUnit as VolumeUnit];
      return ml / volumeConversions[toUnit as VolumeUnit];
      
    case 'count':
      return quantity;
      
    case 'length':
      const cm = quantity * lengthConversions[fromUnit as LengthUnit];
      return cm / lengthConversions[toUnit as LengthUnit];
      
    default:
      throw new Error(`Unsupported unit category: ${category}`);
  }
}

// ============================================================================
// DENSITY-BASED CONVERSIONS - Between Weight and Volume
// ============================================================================

/**
 * Check if we have density data for an ingredient
 */
export function hasDensity(ingredientName: string): boolean {
  return ingredientName.toLowerCase() in ingredientDensities;
}

/**
 * Get density of an ingredient in g/mL
 */
export function getDensity(ingredientName: string): number {
  const density = ingredientDensities[ingredientName.toLowerCase()];
  if (!density) {
    throw new Error(`No density data found for ingredient: ${ingredientName}`);
  }
  return density;
}

/**
 * Convert weight to volume using ingredient density
 * @param weight - Quantity in weight unit
 * @param fromWeightUnit - Weight unit (kg, g, lb, oz)
 * @param toVolumeUnit - Target volume unit (L, mL, tsp, cup, etc)
 * @param ingredientName - Name of ingredient for density lookup
 */
export function convertWeightToVolume(
  weight: number,
  fromWeightUnit: string,
  toVolumeUnit: string,
  ingredientName: string
): number {
  // Convert weight to grams
  const grams = convertUnit(weight, fromWeightUnit, 'g');
  
  // Get density in g/mL
  const density = getDensity(ingredientName);
  
  // Convert grams to mL using density (mL = g / density)
  const ml = grams / density;
  
  // Convert mL to target volume unit
  return convertUnit(ml, 'mL', toVolumeUnit);
}

/**
 * Convert volume to weight using ingredient density
 * @param volume - Quantity in volume unit
 * @param fromVolumeUnit - Volume unit (mL, tsp, cup, etc)
 * @param toWeightUnit - Target weight unit (g, kg, lb, oz)
 * @param ingredientName - Name of ingredient for density lookup
 */
export function convertVolumeToWeight(
  volume: number,
  fromVolumeUnit: string,
  toWeightUnit: string,
  ingredientName: string
): number {
  // Convert volume to mL
  const ml = convertUnit(volume, fromVolumeUnit, 'mL');
  
  // Get density in g/mL
  const density = getDensity(ingredientName);
  
  // Convert mL to grams using density (g = mL * density)
  const grams = ml * density;
  
  // Convert grams to target weight unit
  return convertUnit(grams, 'g', toWeightUnit);
}

// ============================================================================
// SMART CONVERSION - Automatically chooses best method
// ============================================================================

/**
 * Smart conversion that handles both same-category and density-based conversions
 * @throws Error if conversion is not possible
 */
export function smartConvert(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  ingredientName?: string
): number {
  // Check if units are in same category
  if (areUnitsCompatible(fromUnit, toUnit)) {
    return convertUnit(quantity, fromUnit, toUnit);
  }
  
  // If not compatible, try density-based conversion
  const fromCategory = getUnitCategory(fromUnit);
  const toCategory = getUnitCategory(toUnit);
  
  if (!ingredientName) {
    throw new Error(
      `Cannot convert ${fromUnit} to ${toUnit}: Different categories and no ingredient name provided for density lookup.`
    );
  }
  
  if (fromCategory === 'weight' && toCategory === 'volume') {
    return convertWeightToVolume(quantity, fromUnit, toUnit, ingredientName);
  }
  
  if (fromCategory === 'volume' && toCategory === 'weight') {
    return convertVolumeToWeight(quantity, fromUnit, toUnit, ingredientName);
  }
  
  throw new Error(
    `Cannot convert ${fromUnit} (${fromCategory}) to ${toUnit} (${toCategory}). ` +
    `No conversion path available.`
  );
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format quantity with appropriate decimal places based on unit
 */
export function formatQuantity(quantity: number, unit: string): number {
  const category = getUnitCategory(unit);
  
  if (category === 'count') {
    return Math.round(quantity); // Whole numbers for count
  }
  
  // For large metric units, round to 3 decimal places
  if (unit === 'kg' || unit === 'L' || unit === 'm' || unit === 'gal') {
    return Math.round(quantity * 1000) / 1000;
  }
  
  // For small metric units, round to 2 decimal places
  if (unit === 'g' || unit === 'mL' || unit === 'cm' || unit === 'mm') {
    return Math.round(quantity * 100) / 100;
  }
  
  // For imperial/cooking units, round to 2 decimal places
  return Math.round(quantity * 100) / 100;
}

/**
 * Get human-readable error message for unit mismatch
 */
export function getUnitMismatchError(
  recipeUnit: string,
  inventoryUnit: string,
  ingredientName?: string
): string {
  const recipeCategory = getUnitCategory(recipeUnit);
  const inventoryCategory = getUnitCategory(inventoryUnit);
  
  if (!recipeCategory) {
    return `Unknown unit in recipe: "${recipeUnit}"`;
  }
  
  if (!inventoryCategory) {
    return `Unknown unit in inventory: "${inventoryUnit}"`;
  }
  
  if (recipeCategory === inventoryCategory) {
    // Same category but maybe conversion failed
    return `Cannot convert ${recipeUnit} to ${inventoryUnit}. Please check your conversion factors.`;
  }
  
  // Different categories
  if (recipeCategory === 'weight' && inventoryCategory === 'volume') {
    if (ingredientName && hasDensity(ingredientName)) {
      return `Recipe uses ${recipeUnit} (weight) but inventory uses ${inventoryUnit} (volume). ` +
             `We can convert this using density data for ${ingredientName}.`;
    } else {
      return `Recipe uses ${recipeUnit} (weight) but inventory uses ${inventoryUnit} (volume). ` +
             `Please provide density data for ${ingredientName || 'this ingredient'} or use the same unit type.`;
    }
  }
  
  if (recipeCategory === 'volume' && inventoryCategory === 'weight') {
    if (ingredientName && hasDensity(ingredientName)) {
      return `Recipe uses ${recipeUnit} (volume) but inventory uses ${inventoryUnit} (weight). ` +
             `We can convert this using density data for ${ingredientName}.`;
    } else {
      return `Recipe uses ${recipeUnit} (volume) but inventory uses ${inventoryUnit} (weight). ` +
             `Please provide density data for ${ingredientName || 'this ingredient'} or use the same unit type.`;
    }
  }
  
  return `Cannot convert ${recipeUnit} (${recipeCategory}) to ${inventoryUnit} (${inventoryCategory}). ` +
         `Units must be in the same category or have density data.`;
}

/**
 * Suggest base unit for a given category
 */
export function getBaseUnit(category: UnitCategory): string {
  switch (category) {
    case 'weight': return 'g';
    case 'volume': return 'mL';
    case 'count': return 'pieces';
    case 'length': return 'cm';
  }
}

/**
 * Check if a unit is a base unit
 */
export function isBaseUnit(unit: string): boolean {
  return unit === 'g' || unit === 'mL' || unit === 'pieces' || unit === 'cm';
}

/**
 * Normalize a quantity to base unit
 */
export function normalizeToBaseUnit(
  quantity: number,
  fromUnit: string
): { quantity: number; unit: string } {
  const category = getUnitCategory(fromUnit);
  if (!category) {
    throw new Error(`Unknown unit: ${fromUnit}`);
  }
  
  const baseUnit = getBaseUnit(category);
  const converted = convertUnit(quantity, fromUnit, baseUnit);
  
  return {
    quantity: formatQuantity(converted, baseUnit),
    unit: baseUnit
  };
}

// ============================================================================
// TYPE GUARDS - Add these before the final exports
// ============================================================================

/**
 * Check if a string is a valid Unit
 */
export function isValidUnit(unit: string): unit is Unit {
  return getUnitCategory(unit) !== null;
}

/**
 * Safely convert string to Unit or throw error
 */
export function toValidUnit(unit: string, fieldName?: string): Unit {
  if (isValidUnit(unit)) {
    return unit;
  }
  throw new Error(`Invalid unit "${unit}"${fieldName ? ` for field ${fieldName}` : ''}`);
}

/**
 * Check if a unit is a valid weight unit
 */
export function isValidWeightUnit(unit: string): unit is WeightUnit {
  return unit in weightConversions;
}

/**
 * Check if a unit is a valid volume unit
 */
export function isValidVolumeUnit(unit: string): unit is VolumeUnit {
  return unit in volumeConversions;
}

/**
 * Check if a unit is a valid count unit
 */
export function isValidCountUnit(unit: string): unit is CountUnit {
  return unit in countConversions;
}

/**
 * Check if a unit is a valid length unit
 */
export function isValidLengthUnit(unit: string): unit is LengthUnit {
  return unit in lengthConversions;
}

// ============================================================================
// COMPATIBLE UNITS
// ============================================================================

/**
 * Get all compatible units for a given category
 */
export function getCompatibleUnits(category: UnitCategory): Unit[] {
  switch (category) {
    case 'weight':
      return ['kg', 'g', 'mg', 'lb', 'oz'];
    case 'volume':
      return ['L', 'mL', 'tsp', 'tbsp', 'cup', 'fl_oz', 'gal', 'qt', 'pt'];
    case 'count':
      return ['pieces', 'pcs', 'box', 'boxes', 'bottle', 'bottles', 'bag', 'bags', 'pack', 'packs', 'can', 'cans'];
    case 'length':
      return ['m', 'cm', 'mm', 'inch', 'in', 'ft'];
    default:
      return [];
  }
}

/**
 * Get all compatible units for a given unit
 */
export function getCompatibleUnitsForUnit(unit: string): Unit[] {
  const category = getUnitCategory(unit);
  if (!category) return [];
  return getCompatibleUnits(category);
}

/**
 * Check if a unit is compatible with another unit
 */
export function isCompatibleWith(unit1: string, unit2: string): boolean {
  const category1 = getUnitCategory(unit1);
  const category2 = getUnitCategory(unit2);
  if (!category1 || !category2) return false;
  return category1 === category2;
}