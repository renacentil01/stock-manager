import { Product, Transaction } from './types'

export interface InventoryMetrics {
  totalProducts: number
  totalStockValue: number
  totalCostValue: number
  avgMargin: number
  avgMarginPct: number
  turnoverRate: number
  lowStockCount: number
  outOfStockCount: number
  overstockedCount: number
  deadStockCount: number
  profitPotential: number
}

export interface AIInsight {
  type: 'summary' | 'recommendation' | 'risk' | 'opportunity'
  title: string
  message: string
  priority?: 'high' | 'medium' | 'low'
}

export interface StockMovement {
  date: string
  dateLabel: string
  stockIn: number
  stockOut: number
}

export interface CategoryData {
  name: string
  value: number
  count: number
}

export interface TopProduct {
  name: string
  value: number
  quantity: number
}

export interface LowStockTrend {
  date: string
  dateLabel: string
  lowStock: number
  outOfStock: number
}

// ─── Calculate Metrics ─────────────────────────────
export function calculateMetrics(products: Product[], transactions: Transaction[]): InventoryMetrics {
  const totalProducts = products.length
  const totalStockValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0)
  const totalCostValue = products.reduce((sum, p) => sum + p.cost * p.quantity, 0)

  const avgMargin = totalProducts > 0
    ? products.reduce((sum, p) => sum + (p.price - p.cost), 0) / totalProducts
    : 0
  const avgMarginPct = totalProducts > 0
    ? products.reduce((sum, p) => sum + (p.price - p.cost) / p.price, 0) / totalProducts * 100
    : 0

  // Turnover rate: total out quantity / average stock
  const totalOutQty = transactions
    .filter(t => t.type === 'out')
    .reduce((sum, t) => sum + t.quantity, 0)
  const avgStock = totalProducts > 0
    ? products.reduce((sum, p) => sum + p.quantity, 0) / totalProducts
    : 0
  const turnoverRate = avgStock > 0 ? totalOutQty / avgStock : 0

  const lowStockCount = products.filter(p => p.quantity <= p.minStock && p.quantity > 0).length
  const outOfStockCount = products.filter(p => p.quantity === 0).length
  const overstockedCount = products.filter(p => p.quantity > p.minStock * 5).length
  const profitPotential = products.reduce((sum, p) => sum + (p.price - p.cost) * p.quantity, 0)

  // Dead stock: no transactions in last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const activeProductIds = new Set(
    transactions.filter(t => new Date(t.createdAt).getTime() > thirtyDaysAgo).map(t => t.productId)
  )
  const deadStockCount = products.filter(p => !activeProductIds.has(p.id)).length

  return {
    totalProducts,
    totalStockValue,
    totalCostValue,
    avgMargin,
    avgMarginPct,
    turnoverRate,
    lowStockCount,
    outOfStockCount,
    overstockedCount,
    deadStockCount,
    profitPotential,
  }
}

// ─── Stock Movement Data (last 7 days) ──────────────
export function getStockMovementData(transactions: Transaction[]): StockMovement[] {
  const days: StockMovement[] = []
  const now = new Date()

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const dayTx = transactions.filter(t => {
      const txDate = new Date(t.createdAt).toISOString().split('T')[0]
      return txDate === dateStr
    })

    days.push({
      date: dateStr,
      dateLabel: date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
      stockIn: dayTx.filter(t => t.type === 'in').reduce((sum, t) => sum + t.quantity, 0),
      stockOut: dayTx.filter(t => t.type === 'out').reduce((sum, t) => sum + t.quantity, 0),
    })
  }

  return days
}

// ─── Category Distribution ──────────────────────────
export function getCategoryDistribution(products: Product[]): CategoryData[] {
  const map: Record<string, CategoryData> = {}

  products.forEach(p => {
    if (!map[p.category]) {
      map[p.category] = { name: p.category, value: 0, count: 0 }
    }
    map[p.category].value += p.price * p.quantity
    map[p.category].count++
  })

  return Object.values(map).sort((a, b) => b.value - a.value)
}

// ─── Top Products ───────────────────────────────────
export function getTopProducts(products: Product[], limit = 10): TopProduct[] {
  return products
    .map(p => ({
      name: p.name,
      value: p.price * p.quantity,
      quantity: p.quantity,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// ─── Low Stock Trend (last 14 days, simulated) ──────
export function getLowStockTrend(products: Product[], transactions: Transaction[]): LowStockTrend[] {
  const days: LowStockTrend[] = []
  const now = new Date()

  for (let i = 13; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const ts = date.getTime()

    // Simulate stock levels at this point by reversing transactions after this date
    const futureTx = transactions.filter(t => new Date(t.createdAt).getTime() > ts)
    const adjustedProducts = products.map(p => {
      const adj = futureTx
        .filter(t => t.productId === p.id)
        .reduce((qty, t) => {
          return t.type === 'in' ? qty - t.quantity : qty + t.quantity
        }, p.quantity)
      return { ...p, quantity: Math.max(0, adj) }
    })

    const lowStock = adjustedProducts.filter(p => p.quantity <= p.minStock && p.quantity > 0).length
    const outOfStock = adjustedProducts.filter(p => p.quantity === 0).length

    days.push({
      date: dateStr,
      dateLabel: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      lowStock,
      outOfStock,
    })
  }

  return days
}

// ─── Generate AI Insights ───────────────────────────
export function generateInsights(products: Product[], transactions: Transaction[]): AIInsight[] {
  const metrics = calculateMetrics(products, transactions)
  const insights: AIInsight[] = []

  // ─── Summary ──────────────────────────────────
  const summaryParts: string[] = []
  summaryParts.push(
    `Inventory kamu memiliki ${metrics.totalProducts} produk dengan total nilai stok ${formatRupiah(metrics.totalStockValue)}.`
  )
  if (metrics.lowStockCount > 0 || metrics.outOfStockCount > 0) {
    summaryParts.push(
      `Ada ${metrics.lowStockCount + metrics.outOfStockCount} produk yang perlu perhatian segera (${metrics.outOfStockCount} stok habis, ${metrics.lowStockCount} stok menipis).`
    )
  } else {
    summaryParts.push('Semua stok dalam kondisi aman dan terkendali.')
  }
  summaryParts.push(
    `Potensi keuntungan dari stok saat ini adalah ${formatRupiah(metrics.profitPotential)} dengan rata-rata margin ${metrics.avgMarginPct.toFixed(1)}%.`
  )

  insights.push({
    type: 'summary',
    title: '📊 Ringkasan Inventory',
    message: summaryParts.join(' '),
  })

  // ─── Recommendations ──────────────────────────
  if (metrics.outOfStockCount > 0) {
    const oosProducts = products.filter(p => p.quantity === 0)
    insights.push({
      type: 'recommendation',
      title: '🚨 Restock Segera',
      message: `${oosProducts.length} produk sudah habis: ${oosProducts.map(p => p.name).slice(0, 5).join(', ')}${oosProducts.length > 5 ? ` dan ${oosProducts.length - 5} lainnya` : ''}. Lakukan pemesanan ulang sekarang untuk menghindari kehilangan penjualan.`,
      priority: 'high',
    })
  }

  if (metrics.lowStockCount > 0) {
    const lowProducts = products.filter(p => p.quantity <= p.minStock && p.quantity > 0)
    const urgentProducts = lowProducts.filter(p => p.quantity <= p.minStock * 0.5)
    insights.push({
      type: 'recommendation',
      title: '📦 Rencana Restock',
      message: `${lowProducts.length} produk di bawah stok minimum. ${urgentProducts.length > 0 ? `${urgentProducts.length} di antaranya kritis (${urgentProducts.map(p => `${p.name}: ${p.quantity}/${p.minStock}`).slice(0, 3).join(', ')}). ` : ''}Buat rencana restock berdasarkan tingkat konsumsi masing-masing produk.`,
      priority: 'medium',
    })
  }

  // Transaction velocity recommendations
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recentOutTx = transactions.filter(t => t.type === 'out' && new Date(t.createdAt).getTime() > thirtyDaysAgo)
  const velocityMap: Record<string, number> = {}
  recentOutTx.forEach(t => {
    velocityMap[t.productId] = (velocityMap[t.productId] || 0) + t.quantity
  })

  const highVelocity = Object.entries(velocityMap)
    .filter(([, qty]) => qty > 5)
    .map(([id, qty]) => {
      const product = products.find(p => p.id === id)
      return product ? { product, velocity: qty } : null
    })
    .filter(Boolean) as { product: Product; velocity: number }[]

  if (highVelocity.length > 0) {
    const names = highVelocity.slice(0, 4).map(h => `${h.product.name} (${h.velocity} unit/30 hari)`)
    insights.push({
      type: 'recommendation',
      title: '⚡ Tingkatkan Stok Produk Laris',
      message: `Produk dengan penjualan tinggi: ${names.join(', ')}. Pertimbangkan untuk menambah buffer stok 30-50% lebih banyak dari biasanya.`,
      priority: 'medium',
    })
  }

  // ─── Risk Alerts ──────────────────────────────
  if (metrics.overstockedCount > 0) {
    const overProducts = products.filter(p => p.quantity > p.minStock * 5)
    insights.push({
      type: 'risk',
      title: '📦 Overstock',
      message: `${overProducts.length} produk memiliki stok berlebih: ${overProducts.map(p => `${p.name} (${p.quantity} unit, ${p.minStock}x min)`).slice(0, 3).join(', ')}. Stok berlebih mengikat modal dan memakan ruang penyimpanan. Pertimbangkan promosi atau bundling.`,
      priority: 'medium',
    })
  }

  if (metrics.deadStockCount > 0) {
    const activeProductIds = new Set(recentOutTx.map(t => t.productId))
    const deadProducts = products.filter(p => !activeProductIds.has(p.id))
    insights.push({
      type: 'risk',
      title: '💀 Dead Stock',
      message: `${deadProducts.length} produk tidak memiliki transaksi penjualan dalam 30 hari terakhir: ${deadProducts.map(p => p.name).slice(0, 4).join(', ')}${deadProducts.length > 4 ? ` dan lainnya` : ''}. Nilai dead stock: ${formatRupiah(deadProducts.reduce((s, p) => s + p.cost * p.quantity, 0))}.`,
      priority: 'high',
    })
  }

  // Zero sales products
  const allSoldProductIds = new Set(transactions.filter(t => t.type === 'out').map(t => t.productId))
  const noSalesProducts = products.filter(p => !allSoldProductIds.has(p.id) && p.quantity > 0)
  if (noSalesProducts.length > 0) {
    insights.push({
      type: 'risk',
      title: '🔍 Produk Tanpa Penjualan',
      message: `${noSalesProducts.length} produk belum pernah terjual: ${noSalesProducts.map(p => p.name).slice(0, 3).join(', ')}. Analisis apakah ini produk baru, kurang promosi, atau perlu dihentikan.`,
      priority: 'medium',
    })
  }

  // Low margin products
  const lowMarginProducts = products.filter(p => p.price > 0 && ((p.price - p.cost) / p.price) < 0.15)
  if (lowMarginProducts.length > 0) {
    insights.push({
      type: 'risk',
      title: '📉 Margin Rendah',
      message: `${lowMarginProducts.length} produk memiliki margin di bawah 15%: ${lowMarginProducts.map(p => `${p.name} (${(((p.price - p.cost) / p.price) * 100).toFixed(1)}%)`).slice(0, 3).join(', ')}. Evaluasi harga jual atau cari supplier dengan harga lebih baik.`,
      priority: 'medium',
    })
  }

  // ─── Opportunities ────────────────────────────
  const highMarginProducts = products
    .filter(p => p.price > 0)
    .sort((a, b) => ((b.price - b.cost) / b.price) - ((a.price - a.cost) / a.price))
    .slice(0, 3)

  if (highMarginProducts.length > 0) {
    const totalHighMarginRevenue = highMarginProducts.reduce((s, p) => s + (p.price - p.cost) * p.quantity, 0)
    insights.push({
      type: 'opportunity',
      title: '💎 Produk High-Margin',
      message: `Fokus promosi pada produk ber-margin tinggi: ${highMarginProducts.map(p => `${p.name} (${(((p.price - p.cost) / p.price) * 100).toFixed(1)}% margin)`).join(', ')}. Total potensi keuntungan: ${formatRupiah(totalHighMarginRevenue)}.`,
    })
  }

  // Restock timing
  const productsNearReorder = products.filter(p => {
    const velocity = velocityMap[p.id] || 0
    const daysUntilEmpty = velocity > 0 ? (p.quantity / (velocity / 30)) : Infinity
    return daysUntilEmpty <= 7 && p.quantity > 0
  })

  if (productsNearReorder.length > 0) {
    insights.push({
      type: 'opportunity',
      title: '⏰ Timing Restock Optimal',
      message: `${productsNearReorder.length} produk akan habis dalam ≤7 hari berdasarkan kecepatan penjualan: ${productsNearReorder.map(p => `${p.name} (~${Math.ceil(p.quantity / ((velocityMap[p.id] || 1) / 30))} hari)`).slice(0, 3).join(', ')}. Restock sekarang untuk menjaga kontinuitas.`,
    })
  }

  // Category value concentration
  const categoryData = getCategoryDistribution(products)
  if (categoryData.length > 1) {
    const topCat = categoryData[0]
    const topPct = (topCat.value / metrics.totalStockValue * 100).toFixed(0)
    if (parseFloat(topPct) > 50) {
      insights.push({
        type: 'opportunity',
        title: '⚖️ Diversifikasi Kategori',
        message: `Kategori "${topCat.name}" menyumbang ${topPct}% dari total nilai stok (${formatRupiah(topCat.value)}). Pertimbangkan untuk mendiversifikasi investasi ke kategori lain untuk mengurangi risiko.`,
      })
    }
  }

  // Bundle opportunity
  const complementaryProducts = products.filter(p => {
    const velocity = velocityMap[p.id] || 0
    return velocity > 3 && p.quantity > p.minStock * 2
  })
  if (complementaryProducts.length >= 2) {
    insights.push({
      type: 'opportunity',
      title: '🎯 Peluang Bundle/Promo',
      message: `${complementaryProducts.length} produk memiliki stok berlebih dan penjualan aktif. Buat bundle atau promo khusus untuk meningkatkan volume penjualan dan membersihkan stok: ${complementaryProducts.map(p => p.name).slice(0, 3).join(', ')}.`,
    })
  }

  return insights
}

// ─── Helper ─────────────────────────────────────────
function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
}
