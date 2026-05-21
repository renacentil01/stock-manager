import { Product, Transaction, Category, DEFAULT_CATEGORIES } from './types'

const PRODUCTS_KEY = 'stock_manager_products'
const TRANSACTIONS_KEY = 'stock_manager_transactions'
const CATEGORIES_KEY = 'stock_manager_categories'

// ─── Products ────────────────────────────────────────
export function getProducts(): Product[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(PRODUCTS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products))
}

export function addProduct(product: Product) {
  const products = getProducts()
  products.push(product)
  saveProducts(products)
  return product
}

export function updateProduct(id: string, updates: Partial<Product>) {
  const products = getProducts()
  const idx = products.findIndex(p => p.id === id)
  if (idx !== -1) {
    products[idx] = { ...products[idx], ...updates, updatedAt: new Date().toISOString() }
    saveProducts(products)
    return products[idx]
  }
  return null
}

export function deleteProduct(id: string) {
  const products = getProducts().filter(p => p.id !== id)
  saveProducts(products)
}

// ─── Transactions ────────────────────────────────────
export function getTransactions(): Transaction[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(TRANSACTIONS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveTransactions(transactions: Transaction[]) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions))
}

export function addTransaction(transaction: Transaction) {
  const transactions = getTransactions()
  transactions.unshift(transaction)
  saveTransactions(transactions)

  // Update product stock
  const products = getProducts()
  const product = products.find(p => p.id === transaction.productId)
  if (product) {
    const newQty = transaction.type === 'in'
      ? product.quantity + transaction.quantity
      : product.quantity - transaction.quantity
    product.quantity = Math.max(0, newQty)
    product.updatedAt = new Date().toISOString()
    saveProducts(products)
  }

  return transaction
}

// ─── Categories ──────────────────────────────────────
export function getCategories(): Category[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES
  const data = localStorage.getItem(CATEGORIES_KEY)
  if (data) return JSON.parse(data)
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES))
  return DEFAULT_CATEGORIES
}

export function saveCategories(categories: Category[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
}

export function addCategory(category: Category) {
  const categories = getCategories()
  categories.push(category)
  saveCategories(categories)
  return category
}

export function updateCategory(id: string, updates: Partial<Category>) {
  const categories = getCategories()
  const idx = categories.findIndex(c => c.id === id)
  if (idx !== -1) {
    categories[idx] = { ...categories[idx], ...updates }
    saveCategories(categories)
    return categories[idx]
  }
  return null
}

export function deleteCategory(id: string) {
  const categories = getCategories().filter(c => c.id !== id)
  saveCategories(categories)
}

// ─── Seed Demo Data ──────────────────────────────────
export function seedDemoData() {
  if (getProducts().length > 0) return false

  const now = new Date()
  const in30 = new Date(now.getTime() + 86400000 * 30).toISOString()
  const in90 = new Date(now.getTime() + 86400000 * 90).toISOString()
  const in180 = new Date(now.getTime() + 86400000 * 180).toISOString()
  const in365 = new Date(now.getTime() + 86400000 * 365).toISOString()
  const expired = new Date(now.getTime() - 86400000 * 5).toISOString()

  const demoProducts: Product[] = [
    { id: '1', name: 'Kopi Arabica 250g', sku: 'KOP-001', category: 'Makanan & Minuman', price: 45000, cost: 28000, quantity: 85, minStock: 20, unit: 'pack', description: 'Kopi arabica premium', expiryDate: in90, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '2', name: 'Teh Hijau Celup', sku: 'TEH-001', category: 'Makanan & Minuman', price: 12000, cost: 6000, quantity: 150, minStock: 30, unit: 'pack', description: 'Teh hijau celup 25 kantong', expiryDate: in180, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '3', name: 'Mouse Wireless Logitech', sku: 'ELK-001', category: 'Elektronik', price: 250000, cost: 180000, quantity: 8, minStock: 5, unit: 'pcs', description: 'Logitech M240 Silent', expiryDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '4', name: 'Kabel USB-C 1m', sku: 'ELK-002', category: 'Elektronik', price: 35000, cost: 15000, quantity: 45, minStock: 10, unit: 'pcs', description: 'Fast charging cable', expiryDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '5', name: 'Kaos Polos Cotton', sku: 'PKT-001', category: 'Pakaian', price: 85000, cost: 45000, quantity: 3, minStock: 10, unit: 'pcs', description: 'Cotton combed 30s', expiryDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '6', name: 'Kertas A4 500 lembar', sku: 'KNT-001', category: 'Perlengkapan Kantor', price: 38000, cost: 25000, quantity: 62, minStock: 15, unit: 'pack', description: 'PaperOne A4 70gsm', expiryDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '7', name: 'Pulpen Pilot 0.5mm', sku: 'KNT-002', category: 'Perlengkapan Kantor', price: 8000, cost: 4500, quantity: 200, minStock: 50, unit: 'pcs', description: 'Pilot G-2 05', expiryDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '8', name: 'Charger GaN 65W', sku: 'ELK-003', category: 'Elektronik', price: 350000, cost: 220000, quantity: 2, minStock: 3, unit: 'pcs', description: '3 port USB-C + USB-A', expiryDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '9', name: 'Susu UHT 1L', sku: 'MNM-001', category: 'Makanan & Minuman', price: 18000, cost: 12000, quantity: 40, minStock: 15, unit: 'pcs', description: 'Ultra Milk Full Cream', expiryDate: expired, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '10', name: 'Roti Tawar Premium', sku: 'MNM-002', category: 'Makanan & Minuman', price: 15000, cost: 9000, quantity: 25, minStock: 10, unit: 'pcs', description: 'Sari Roti Wheat', expiryDate: in30, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]

  const demoTransactions: Transaction[] = [
    { id: '1', productId: '1', type: 'in', quantity: 50, notes: 'Restock dari supplier', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: '2', productId: '3', type: 'out', quantity: 2, notes: 'Penjualan online', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', productId: '5', type: 'out', quantity: 7, notes: 'Order reseller', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
    { id: '4', productId: '6', type: 'in', quantity: 100, notes: 'Bulk order dari PaperOne', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: '5', productId: '8', type: 'out', quantity: 3, notes: 'Walk-in customer', createdAt: new Date(Date.now() - 3600000).toISOString() },
  ]

  saveProducts(demoProducts)
  saveTransactions(demoTransactions)
  return true
}
