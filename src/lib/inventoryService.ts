import { Inventory } from '@/models/Inventory';
import { StockAdjustment, BatchStockAdjustment, BatchAdjustmentResult, StockCheckResult, LowStockAlert } from '@/types';
import { Unit } from '@/lib/unit-conversion';

const API_BASE = '/api/products/stocks';

// Helper to handle response
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      try {
        errorMessage = await response.text() || errorMessage;
      } catch {}
    }
    throw new Error(errorMessage);
  }
  
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('Failed to parse JSON. Response text:', text.substring(0, 200));
    if (response.url.includes('/api/products/stocks') && !response.url.includes('/adjust')) {
      return [] as unknown as T;
    }
    throw new Error('Invalid JSON response from server');
  }
}

// Fetch all inventory items with filters
export async function fetchInventory(
  category?: string,
  status?: string,
  search?: string
): Promise<Inventory[]> {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);
    
    const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    return handleResponse<Inventory[]>(response);
  } catch (error) {
    console.error('Error in fetchInventory:', error);
    throw error;
  }
}

// Create new inventory item
export async function createInventoryItem(
  item: Omit<Inventory, '_id' | 'createdAt' | 'updatedAt'>
): Promise<Inventory> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    
    return handleResponse<Inventory>(response);
  } catch (error) {
    console.error('Error in createInventoryItem:', error);
    throw error;
  }
}

// Delete inventory item
export async function deleteInventoryItem(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}?id=${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    
    await handleResponse(response);
  } catch (error) {
    console.error('Error in deleteInventoryItem:', error);
    throw error;
  }
}

// Get inventory item by ID
export async function getInventoryItem(id: string): Promise<Inventory> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    return handleResponse<Inventory>(response);
  } catch (error) {
    console.error('Error in getInventoryItem:', error);
    throw error;
  }
}

// Get inventory item by name (for ingredient lookup)
export async function getInventoryItemByName(name: string): Promise<Inventory | null> {
  try {
    const response = await fetch(`${API_BASE}/search?name=${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.status === 404) return null;
    return handleResponse<Inventory>(response);
  } catch (error) {
    console.error('Error in getInventoryItemByName:', error);
    throw error;
  }
}

// Adjust single item stock
  export async function adjustStock(
    itemId: string,
    adjustment: {
      type: 'restock' | 'usage' | 'waste' | 'correction' | 'deduction';
      quantity: number;
      unit?: Unit;  // Now Unit is properly imported
      notes?: string;
      performedBy: string;
      reference?: {
        type: 'order' | 'manual' | 'return' | 'adjustment' | 'rollback';
        id?: string;
        number?: string;
      };
    }
  ): Promise<{
    newStock: number;
    status: string;
    adjustment: any;
    conversionNote?: string;
  }> {
    try {
      // ✅ Use the dynamic route with itemId in the URL
      const response = await fetch(`${API_BASE}/${itemId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustment)
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Error in adjustStock:', error);
      throw error;
    }
  }

// Batch check stock availability for multiple ingredients
export async function checkStockAvailability(
  items: Array<{ itemName: string; quantity: number; unit?: string }>
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
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error in checkStockAvailability:', error);
    throw error;
  }
}

// Batch adjust stock for multiple items (for order processing)
export async function batchAdjustStock(
  adjustments: BatchStockAdjustment[],
  reference: { type: 'order'; id: string; number: string }
): Promise<BatchAdjustmentResult> {
  try {
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
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
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error in batchAdjustStock:', error);
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
          type: adj.type === 'deduction' ? 'restock' : 'deduction',
          notes: `Rollback of transaction ${transactionId}`,
          reference: {
            type: 'return',
            id: transactionId
          }
        }))
      })
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error in rollbackTransaction:', error);
    throw error;
  }
}

// Get low stock alerts
export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
  try {
    const response = await fetch(`${API_BASE}/alerts/low-stock`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    return handleResponse<LowStockAlert[]>(response);
  } catch (error) {
    console.error('Error in getLowStockAlerts:', error);
    return [];
  }
}

// Get critical stock alerts
export async function getCriticalStockAlerts(): Promise<LowStockAlert[]> {
  try {
    const response = await fetch(`${API_BASE}/alerts/critical`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    return handleResponse<LowStockAlert[]>(response);
  } catch (error) {
    console.error('Error in getCriticalStockAlerts:', error);
    return [];
  }
}

// Get inventory by ingredient names (batch lookup)
export async function getInventoryByNames(names: string[]): Promise<Inventory[]> {
  try {
    const response = await fetch(`${API_BASE}/batch-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names })
    });
    
    const result = await handleResponse<any>(response);
    
    // ✅ Handle both array and object responses
    if (Array.isArray(result)) {
      return result;
    } else if (result && result.items && Array.isArray(result.items)) {
      return result.items;
    } else if (result && typeof result === 'object') {
      // If it's an object but not the expected format, return empty array
      console.warn('Unexpected response format from batch-lookup:', result);
      return [];
    }
    
    return [];
  } catch (error) {
    console.error('Error in getInventoryByNames:', error);
    return []; // ✅ Return empty array on error instead of throwing
  }
}

// Update inventory item
export async function updateInventoryItem(
  id: string,
  updates: Partial<Inventory>
): Promise<Inventory> {
  try {
    const response = await fetch(API_BASE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates })
    });
    
    return handleResponse<Inventory>(response);
  } catch (error) {
    console.error('Error in updateInventoryItem:', error);
    throw error;
  }
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
  try {
    const response = await fetch(`${API_BASE}/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error in getInventoryStats:', error);
    throw error;
  }
}