'use client'

import { useState, useEffect } from 'react'
import { getProducts, getTransactions, getCategories } from '@/lib/store'
import { Product, Transaction } from '@/lib/types'
import Link from 'next/link'
import { getExpiryStatus, getDaysUntilExpiry, getExpiryLabel } from '@/lib/expiry'

function formatRupiah(num: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}j lalu`
  const days = Math.floor(hours / 24)
  return `${days}h lalu`
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setProducts(getProducts())
    setTransactions(getTransactions())
    setMounted(true)
  }, [])

  if (!mounted) return <DashboardSkeleton />

  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
  const totalCostValue = products.reduce((sum, p) => sum + (p.cost * p.quantity), 0)
  const lowStock = products.filter(p => p.quantity <= p.minStock)
  const recentTx = transactions.slice(0, 8)

  // Expiry stats
  const expiredProducts = products.filter(p => getExpiryStatus(p.expiryDate) === 'expired')
  const expiringSoonProducts = products.filter(p => getExpiryStatus(p.expiryDate) === 'expiring_soon')
  const expiring7Days = products.filter(p => {
    const days = getDaysUntilExpiry(p.expiryDate)
    return days !== null && days >= 0 && days <= 7
  })
  const expiryAlertCount = expiredProducts.length + expiringSoonProducts.length

  // Category breakdown
  const catMap: Record<string, { count: number; value: number }> = {}
  const categories = getCategories()
  products.forEach(p => {
    if (!catMap[p.category]) catMap[p.category] = { count: 0, value: 0 }
    catMap[p.category].count++
    catMap[p.category].value += p.price * p.quantity
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 mt-1">Ringkasan data inventory kamu</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard
          title="Total Produk"
          value={totalProducts.toString()}
          subtitle="produk terdaftar"
          icon="📦"
          color="indigo"
        />
        <StatCard
          title="Nilai Stok"
          value={formatRupiah(totalValue)}
          subtitle={`${formatRupiah(totalCostValue)} modal`}
          icon="💰"
          color="emerald"
        />
        <StatCard
          title="Stok Menipis"
          value={lowStock.length.toString()}
          subtitle={lowStock.length > 0 ? `${lowStock.length} perlu restock` : 'Semua aman'}
          icon={lowStock.length > 0 ? '⚠️' : '✅'}
          color={lowStock.length > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="⏰ Kedaluarsa"
          value={expiryAlertCount.toString()}
          subtitle={expiryAlertCount > 0 ? `${expiredProducts.length} kedaluarsa, ${expiringSoonProducts.length} segera` : 'Semua aman'}
          icon={expiryAlertCount > 0 ? '⏰' : '✅'}
          color={expiryAlertCount > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          title="Transaksi"
          value={transactions.length.toString()}
          subtitle={`${transactions.filter(t => t.type === 'in').length} masuk, ${transactions.filter(t => t.type === 'out').length} keluar`}
          icon="📊"
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category Breakdown */}
        <div className="card lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Kategori</h3>
          <div className="space-y-3">
            {categories.map(cat => {
              const data = catMap[cat.name] || { count: 0, value: 0 }
              const maxVal = Math.max(...Object.values(catMap).map(v => v.value), 1)
              const widthPct = (data.value / maxVal) * 100
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="text-gray-500">{data.count} item</span>
                  </div>
                  <div className="w-full h-2 bg-[#222632] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${widthPct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              )
            })}
            {Object.keys(catMap).length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">Belum ada data</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">⚠️ Stok Menipis</h3>
            {lowStock.length > 0 && (
              <span className="badge-danger">{lowStock.length}</span>
            )}
          </div>
          <div className="space-y-3">
            {lowStock.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-[#222632] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-200">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.sku}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${p.quantity === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {p.quantity}
                  </p>
                  <p className="text-xs text-gray-500">min: {p.minStock}</p>
                </div>
              </div>
            ))}
            {lowStock.length === 0 && (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-sm text-gray-500">Semua stok aman!</p>
              </div>
            )}
            {lowStock.length > 5 && (
              <Link href="/products" className="block text-center text-sm text-indigo-400 hover:text-indigo-300 py-2">
                Lihat semua ({lowStock.length}) →
              </Link>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">📋 Aktivitas Terbaru</h3>
            <Link href="/transactions" className="text-xs text-indigo-400 hover:text-indigo-300">Lihat semua →</Link>
          </div>
          <div className="space-y-2">
            {recentTx.map(tx => {
              const product = products.find(p => p.id === tx.productId)
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 bg-[#222632] rounded-lg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    tx.type === 'in' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {tx.type === 'in' ? '↓' : '↑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{product?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{tx.notes || (tx.type === 'in' ? 'Stock masuk' : 'Stock keluar')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${tx.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                    </p>
                    <p className="text-xs text-gray-500">{timeAgo(tx.createdAt)}</p>
                  </div>
                </div>
              )
            })}
            {recentTx.length === 0 && (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-gray-500">Belum ada transaksi</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expiry Alerts Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">⏰ Expiry Alerts</h3>
          {expiryAlertCount > 0 && (
            <span className="badge-danger">{expiryAlertCount}</span>
          )}
        </div>
        <div className="space-y-3">
          {/* Expired products (red) */}
          {expiredProducts.map(p => {
            const daysLeft = getDaysUntilExpiry(p.expiryDate)
            return (
              <div key={p.id} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔴</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-400">KEDALUARSA</p>
                  <p className="text-xs text-red-400">{getExpiryLabel(p.expiryDate)}</p>
                  <p className="text-xs text-gray-500">Stok: {p.quantity} {p.unit}</p>
                </div>
              </div>
            )
          })}

          {/* Expiring within 7 days (orange) */}
          {expiring7Days.filter(p => getExpiryStatus(p.expiryDate) === 'expiring_soon').map(p => {
            const daysLeft = getDaysUntilExpiry(p.expiryDate)
            return (
              <div key={p.id} className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🟠</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-orange-400">{daysLeft !== null ? `${daysLeft} HARI LAGI` : ''}</p>
                  <p className="text-xs text-orange-400">{getExpiryLabel(p.expiryDate)}</p>
                  <p className="text-xs text-gray-500">Stok: {p.quantity} {p.unit}</p>
                </div>
              </div>
            )
          })}

          {/* Expiring within 8-30 days (yellow) */}
          {expiringSoonProducts.filter(p => {
            const days = getDaysUntilExpiry(p.expiryDate)
            return days !== null && days > 7 && days <= 30
          }).map(p => {
            const daysLeft = getDaysUntilExpiry(p.expiryDate)
            return (
              <div key={p.id} className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🟡</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-400">{daysLeft !== null ? `${daysLeft} HARI LAGI` : ''}</p>
                  <p className="text-xs text-amber-400">{getExpiryLabel(p.expiryDate)}</p>
                  <p className="text-xs text-gray-500">Stok: {p.quantity} {p.unit}</p>
                </div>
              </div>
            )
          })}

          {/* No alerts */}
          {expiryAlertCount === 0 && (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-sm text-gray-500">Semua produk aman!</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Products by Value */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">💎 Top Produk (Nilai Stok)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {products
            .sort((a, b) => (b.price * b.quantity) - (a.price * a.quantity))
            .slice(0, 4)
            .map(p => (
              <div key={p.id} className="p-4 bg-[#222632] rounded-xl hover:bg-[#282c3a] transition-colors">
                <p className="text-sm font-medium text-gray-200 truncate">{p.name}</p>
                <p className="text-xs text-gray-500 mt-1">{p.sku} • {p.quantity} {p.unit}</p>
                <p className="text-lg font-bold text-indigo-400 mt-2">{formatRupiah(p.price * p.quantity)}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────
function StatCard({ title, value, subtitle, icon, color }: {
  title: string; value: string; subtitle: string; icon: string; color: string
}) {
  const colorMap: Record<string, string> = {
    indigo: 'from-indigo-600/20 to-indigo-600/5 border-indigo-500/20',
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/20',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/20',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',
    red: 'from-red-600/20 to-red-600/5 border-red-500/20',
  }

  return (
    <div className={`stat-card bg-gradient-to-br ${colorMap[color] || colorMap.indigo}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-white mt-2">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-[#222632] rounded-lg" />
        <div className="h-4 w-64 bg-[#222632] rounded-lg mt-2" />
      </div>
      <div className="grid grid-cols-5 gap-5">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="stat-card">
            <div className="h-4 w-24 bg-[#222632] rounded" />
            <div className="h-8 w-32 bg-[#222632] rounded mt-3" />
            <div className="h-3 w-20 bg-[#222632] rounded mt-2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[1,2,3].map(i => (
          <div key={i} className="card h-64" />
        ))}
      </div>
    </div>
  )
}
