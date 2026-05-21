'use client'

import { useState, useEffect } from 'react'
import { getProducts, getTransactions } from '@/lib/store'
import { Product, Transaction } from '@/lib/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import {
  calculateMetrics, getStockMovementData, getCategoryDistribution,
  getTopProducts, getLowStockTrend, generateInsights,
  AIInsight, InventoryMetrics,
} from '@/lib/ai-insights'

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

function formatRupiah(num: number): string {
  if (num >= 1_000_000_000) return `Rp${(num / 1_000_000_000).toFixed(1)}M`
  if (num >= 1_000_000) return `Rp${(num / 1_000_000).toFixed(1)}jt`
  if (num >= 1_000) return `Rp${(num / 1_000).toFixed(0)}rb`
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
}

function formatRupiahFull(num: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
}

export default function AnalyticsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setProducts(getProducts())
    setTransactions(getTransactions())
    setMounted(true)
  }, [])

  if (!mounted) return <AnalyticsSkeleton />

  const metrics = calculateMetrics(products, transactions)
  const stockMovement = getStockMovementData(transactions)
  const categoryDist = getCategoryDistribution(products)
  const topProducts = getTopProducts(products)
  const lowStockTrend = getLowStockTrend(products, transactions)
  const insights = generateInsights(products, transactions)

  const summaryInsights = insights.filter(i => i.type === 'summary')
  const recommendations = insights.filter(i => i.type === 'recommendation')
  const risks = insights.filter(i => i.type === 'risk')
  const opportunities = insights.filter(i => i.type === 'opportunity')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            AI Analytics
          </h1>
          <p className="text-gray-500 mt-1">Analisis cerdas dan rekomendasi untuk inventory kamu</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Analysis
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Produk" value={metrics.totalProducts.toString()} icon="📦" />
        <MetricCard label="Nilai Stok" value={formatRupiah(metrics.totalStockValue)} icon="💰" />
        <MetricCard label="Profit Potential" value={formatRupiah(metrics.profitPotential)} icon="📈" />
        <MetricCard label="Avg Margin" value={`${metrics.avgMarginPct.toFixed(1)}%`} icon="🎯" />
      </div>

      {/* Charts Section - 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Movement Chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">📊 Stock Movement (7 Hari)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockMovement} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3a" />
                <XAxis dataKey="dateLabel" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1d27',
                    border: '1px solid #2a2e3a',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="stockIn" name="Stock Masuk" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stockOut" name="Stock Keluar" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">🏷️ Distribusi Kategori</h3>
          <div className="h-[280px] flex items-center">
            {categoryDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                  >
                    {categoryDist.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatRupiahFull(value)}
                    contentStyle={{
                      backgroundColor: '#1a1d27',
                      border: '1px solid #2a2e3a',
                      borderRadius: '8px',
                      color: '#e5e7eb',
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full text-center text-gray-500 text-sm">Belum ada data kategori</div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">💎 Top 10 Produk (Nilai Stok)</h3>
          <div className="h-[280px]">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3a" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatRupiah(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip
                    formatter={(value: number) => formatRupiahFull(value)}
                    contentStyle={{
                      backgroundColor: '#1a1d27',
                      border: '1px solid #2a2e3a',
                      borderRadius: '8px',
                      color: '#e5e7eb',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Belum ada data</div>
            )}
          </div>
        </div>

        {/* Low Stock Trend */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">📉 Tren Stok Menipis (14 Hari)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lowStockTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3a" />
                <XAxis dataKey="dateLabel" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1d27',
                    border: '1px solid #2a2e3a',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Line type="monotone" dataKey="lowStock" name="Stok Rendah" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="outOfStock" name="Stok Habis" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Insights</h3>
            <p className="text-xs text-gray-500">Analisis otomatis dari data inventory kamu</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Executive Summary */}
          {summaryInsights.map((insight, i) => (
            <AIChatBubble key={i} insight={insight} />
          ))}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
                💡 Rekomendasi Cerdas
              </h4>
              {recommendations.map((insight, i) => (
                <AIChatBubble key={i} insight={insight} />
              ))}
            </div>
          )}

          {/* Risk Alerts */}
          {risks.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                ⚠️ Peringatan Risiko
              </h4>
              {risks.map((insight, i) => (
                <AIChatBubble key={i} insight={insight} />
              ))}
            </div>
          )}

          {/* Opportunities */}
          {opportunities.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                🎯 Peluang & Insight
              </h4>
              {opportunities.map((insight, i) => (
                <AIChatBubble key={i} insight={insight} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Components ─────────────────────────────────────

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card !p-4 hover:border-indigo-500/30 transition-all">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-lg font-bold text-white mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  )
}

function AIChatBubble({ insight }: { insight: AIInsight }) {
  const priorityColors = {
    high: 'border-l-red-500',
    medium: 'border-l-amber-500',
    low: 'border-l-indigo-500',
  }

  return (
    <div className="flex gap-3">
      {/* Bot avatar */}
      <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>

      {/* Message bubble */}
      <div className={`flex-1 bg-[#222632] rounded-xl p-4 border-l-2 ${priorityColors[insight.priority || 'low']}`}>
        <p className="text-sm font-semibold text-gray-200 mb-1">{insight.title}</p>
        <p className="text-sm text-gray-400 leading-relaxed">{insight.message}</p>
      </div>
    </div>
  )
}

// ─── Loading Skeleton ───────────────────────────────
function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-56 bg-[#222632] rounded-lg" />
        <div className="h-4 w-72 bg-[#222632] rounded-lg mt-2" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card !p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#222632] rounded-lg" />
              <div>
                <div className="h-3 w-20 bg-[#222632] rounded" />
                <div className="h-5 w-28 bg-[#222632] rounded mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts 2x2 */}
      <div className="grid grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card h-[340px]">
            <div className="h-4 w-48 bg-[#222632] rounded mb-4" />
            <div className="h-[280px] bg-[#222632]/50 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Insights Panel */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#222632] rounded-full" />
          <div>
            <div className="h-5 w-32 bg-[#222632] rounded" />
            <div className="h-3 w-48 bg-[#222632] rounded mt-2" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-[#222632] rounded-full flex-shrink-0" />
              <div className="flex-1 bg-[#222632]/50 rounded-xl p-4">
                <div className="h-4 w-40 bg-[#222632] rounded mb-2" />
                <div className="h-3 w-full bg-[#222632] rounded mb-1" />
                <div className="h-3 w-3/4 bg-[#222632] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
