import { InventoryItem } from '@/types';

const API_BASE_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000/api';

// Helper function to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchInventory(
  category?: string,
  status?: string,
  search?: string
): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (status && status !== 'all') params.append('status', status);
  if (search) params.append('search', search);

  const response = await fetch(`${API_BASE_URL}/products/stocks?${params}`, {
    cache: 'no-store'
  });
  
  return handleResponse(response);
}

export async function createInventoryItem(item: Omit<InventoryItem, '_id' | 'createdAt' | 'updatedAt'>) {
  // Validate price
  if (item.pricePerUnit > 1000000) {
    throw new Error('Price per unit cannot exceed ₱1,000,000');
  }

  // Validate stock
  if (item.currentStock > 100000) {
    throw new Error('Stock cannot exceed 100,000 units');
  }

  const response = await fetch(`${API_BASE_URL}/products/stocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });

  return handleResponse(response);
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
  // Validate price if provided
  if (updates.pricePerUnit !== undefined && updates.pricePerUnit > 1000000) {
    throw new Error('Price per unit cannot exceed ₱1,000,000');
  }

  // Validate stock if provided
  if (updates.currentStock !== undefined && updates.currentStock > 100000) {
    throw new Error('Stock cannot exceed 100,000 units');
  }

  const response = await fetch(`${API_BASE_URL}/products/stocks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  return handleResponse(response);
}

export async function deleteInventoryItem(id: string) {
  const response = await fetch(`${API_BASE_URL}/products/stocks/${id}`, {
    method: 'DELETE',
  });

  return handleResponse(response);
}

export async function adjustStock(
  itemId: string,
  data: {
    type: 'restock' | 'usage' | 'waste' | 'correction';
    quantity: number;
    notes?: string;
    performedBy?: string;
  }
) {
  // Validate quantity
  if (data.quantity > 100000) {
    throw new Error('Quantity cannot exceed 100,000 units');
  }

  const response = await fetch(`${API_BASE_URL}/products/stocks/${itemId}/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function getStockAdjustments(itemId: string) {
  const response = await fetch(`${API_BASE_URL}/products/stocks/${itemId}/adjustments`, {
    cache: 'no-store'
  });
  
  return handleResponse(response);
}