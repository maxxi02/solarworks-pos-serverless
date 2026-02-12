import { 
  InventoryItem, 
  StockAdjustment, 
  BatchStockAdjustment,
  BatchAdjustmentResult,
  StockCheckResult,
  LowStockAlert 
} from '@/types';

const API_BASE = '/api/products/stocks'; // Changed to match your folder structure

// Fetch all inventory items with filters
export async function fetchInventory(
  category?: string,
  status?: string,
  search?: string
): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (status && status !== 'all') params.append('status', status);
  if (search) params.append('search', search);
  
  const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch inventory');
  }
  
  return response.json();
}

// Create new inventory item
export async function createInventoryItem(
  item: Omit<InventoryItem, '_id' | 'createdAt' | 'updatedAt'>
): Promise<InventoryItem> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create inventory item');
  }
  
  return response.json();
}

// Delete inventory item
export async function deleteInventoryItem(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}?id=${id}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete inventory item');
  }
}

// Get inventory item by ID
export async function getInventoryItem(id: string): Promise<InventoryItem> {
  const response = await fetch(`${API_BASE}/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch inventory item');
  }
  
  return response.json();
}

// Get inventory item by name (for ingredient lookup)
export async function getInventoryItemByName(name: string): Promise<InventoryItem | null> {
  const response = await fetch(`${API_BASE}/search?name=${encodeURIComponent(name)}`);
  
  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.json();
    throw new Error(error.error || 'Failed to search inventory item');
  }
  
  return response.json();
}

// Adjust single item stock
export async function adjustStock(
  itemId: string,
  adjustment: StockAdjustment
): Promise<{
  newStock: number;
  status: string;
  adjustment: StockAdjustment & { timestamp: Date };
}> {
  const response = await fetch(`${API_BASE}/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, ...adjustment })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to adjust stock');
  }
  
  return response.json();
}

// Batch check stock availability for multiple ingredients
export async function checkStockAvailability(
  items: Array<{ itemId?: string; itemName: string; quantity: number }>
): Promise<{
  allAvailable: boolean;
  results: StockCheckResult[];
  insufficientItems: StockCheckResult[];
}> {
  try {
    const response = await fetch(`${API_BASE}/check-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check stock availability');
    }
    
    return response.json();
  } catch (error) {
    console.error('Check stock availability error:', error);
    throw error;
  }
}

// Batch adjust stock for multiple items (for order processing)
export async function batchAdjustStock(
  adjustments: BatchStockAdjustment[],
  reference: { type: 'order'; id: string; number: string }
): Promise<BatchAdjustmentResult> {
  const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const response = await fetch(`${API_BASE}/batch-adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        adjustments,
        transactionId,
        reference,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to process batch stock adjustment');
    }
    
    const result = await response.json();
    
    // If any items failed, trigger notification
    if (result.failed && result.failed.length > 0) {
      console.warn('Some stock adjustments failed:', result.failed);
    }
    
    return result;
  } catch (error) {
    console.error('Batch adjustment error:', error);
    throw error;
  }
}

// Rollback a failed transaction
export async function rollbackTransaction(
  transactionId: string,
  adjustments: BatchStockAdjustment[]
): Promise<{
  success: boolean;
  message: string;
  rolledBackItems: string[];
  failedRollbacks: string[];
}> {
  try {
    const response = await fetch(`${API_BASE}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId,
        adjustments: adjustments.map(adj => ({
          itemId: adj.itemId,
          quantity: adj.quantity,
          type: adj.type === 'deduction' ? 'restock' : 'deduction', // Reverse the operation
          notes: `Rollback of transaction ${transactionId} for order reference`,
          reference: {
            type: 'return',
            id: transactionId
          }
        }))
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to rollback transaction');
    }
    
    return response.json();
  } catch (error) {
    console.error('Rollback error:', error);
    throw error;
  }
}

// Get low stock alerts
export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
  const response = await fetch(`${API_BASE}/alerts/low-stock`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch low stock alerts');
  }
  
  return response.json();
}

// Get critical stock alerts
export async function getCriticalStockAlerts(): Promise<LowStockAlert[]> {
  const response = await fetch(`${API_BASE}/alerts/critical`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch critical stock alerts');
  }
  
  return response.json();
}

// Get inventory by ingredient names (batch lookup)
export async function getInventoryByNames(names: string[]): Promise<InventoryItem[]> {
  const response = await fetch(`${API_BASE}/batch-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch inventory items');
  }
  
  return response.json();
}

// Update inventory item
export async function updateInventoryItem(
  id: string,
  updates: Partial<InventoryItem>
): Promise<InventoryItem> {
  const response = await fetch(API_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update inventory item');
  }
  
  return response.json();
}

// Get inventory statistics
export async function getInventoryStats(): Promise<{
  totalItems: number;
  totalValue: number;
  criticalCount: number;
  lowCount: number;
  warningCount: number;
  outOfStockCount: number;
  categoriesCount: Record<string, number>;
}> {
  const response = await fetch(`${API_BASE}/stats`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch inventory stats');
  }
  
  return response.json();
}