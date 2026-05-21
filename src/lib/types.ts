export interface Product {
  id: string
  name: string
  sku: string
  category: string
  price: number
  cost: number
  quantity: number
  minStock: number
  unit: string
  description: string
  expiryDate: string | null
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  productId: string
  type: 'in' | 'out'
  quantity: number
  notes: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface DashboardStats {
  totalProducts: number
  totalValue: number
  lowStockCount: number
  totalTransactions: number
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Makanan & Minuman', color: '#f59e0b' },
  { id: '2', name: 'Elektronik', color: '#3b82f6' },
  { id: '3', name: 'Pakaian', color: '#8b5cf6' },
  { id: '4', name: 'Perlengkapan Kantor', color: '#10b981' },
  { id: '5', name: 'Lainnya', color: '#6b7280' },
]

export const UNITS = ['pcs', 'kg', 'gram', 'liter', 'ml', 'box', 'pack', 'roll', 'set', 'pair']
