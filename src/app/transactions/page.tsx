'use client'

import { useState, useEffect, useMemo } from 'react'
import { getProducts, getTransactions, addTransaction } from '@/lib/store'
import { Product, Transaction } from '@/lib/types'
import Modal from '@/components/Modal'
import { v4 as uuid } from 'uuid'

function formatRupiah(num: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function TransactionsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all')
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'in' | 'out'>('in')

  // Form
  const [formProduct, setFormProduct] = useState('')
  const [formQty, setFormQty] = useState(0)
  const [formNotes, setFormNotes] = useState('')

  useEffect(() => {
    setProducts(getProducts())
    setTransactions(getTransactions())
    setMounted(true)
  }, [])

  const reload = () => {
    setProducts(getProducts())
    setTransactions(getTransactions())
  }

  const filtered = useMemo(() => {
    let list = [...transactions]
    if (filterType !== 'all') list = list.filter(t => t.type === filterType)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(t => {
        const product = products.find(p => p.id === t.productId)
        return (product?.name.toLowerCase().includes(s)) || t.notes.toLowerCase().includes(s)
      })
    }
    return list
  }, [transactions, products, search, filterType])

  // Stats
  const todayIn = transactions.filter(t => {
    const d = new Date(t.createdAt)
    const now = new Date()
    return d.toDateString() === now.toDateString() && t.type === 'in'
  }).reduce((sum, t) => sum + t.quantity, 0)

  const todayOut = transactions.filter(t => {
    const d = new Date(t.createdAt)
    const now = new Date()
    return d.toDateString() === now.toDateString() && t.type === 'out'
  }).reduce((sum, t) => sum + t.quantity, 0)

  const handleOpenForm = (type: 'in' | 'out') => {
    setFormType(type)
    setFormProduct(products[0]?.id || '')
    setFormQty(0)
    setFormNotes('')
    setShowForm(true)
  }

  const handleSave = () => {
    if (!formProduct || formQty <= 0) return
    addTransaction({
      id: uuid(),
      productId: formProduct,
      type: formType,
      quantity: formQty,
      notes: formNotes,
      createdAt: new Date().toISOString(),
    })
    setShowForm(false)
    reload()
  }

  if (!mounted) return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="card h-16" />)}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transaksi</h1>
          <p className="text-gray-500 mt-1">Riwayat stock in & stock out</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleOpenForm('out')} className="btn-danger flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            Stock Keluar
          </button>
          <button onClick={() => handleOpenForm('in')} className="btn-success flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            Stock Masuk
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        <div className="stat-card">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Hari Ini Masuk</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">+{todayIn} unit</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Hari Ini Keluar</p>
          <p className="text-2xl font-bold text-red-400 mt-2">-{todayOut} unit</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Transaksi</p>
          <p className="text-2xl font-bold text-indigo-400 mt-2">{transactions.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card !p-4">
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="🔍  Cari nama produk atau catatan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input flex-1"
          />
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Semua', color: '' },
              { value: 'in', label: '↑ Masuk', color: 'text-emerald-400' },
              { value: 'out', label: '↓ Keluar', color: 'text-red-400' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value as typeof filterType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === f.value
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'bg-[#222632] text-gray-400 hover:text-gray-200 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="card !p-0">
        <div className="divide-y divide-[#2a2e3a]">
          {filtered.map(tx => {
            const product = products.find(p => p.id === tx.productId)
            return (
              <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#222632]/50 transition-colors">
                {/* Type icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  tx.type === 'in'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
                }`}>
                  {tx.type === 'in' ? '↓' : '↑'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${
                      tx.type === 'in' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'in' ? 'MASUK' : 'KELUAR'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-200 mt-0.5">{product?.name || 'Produk dihapus'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tx.notes || '—'}</p>
                </div>

                {/* Quantity */}
                <div className="text-right">
                  <p className={`text-lg font-bold ${tx.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                  </p>
                  <p className="text-xs text-gray-500">{product?.unit || 'pcs'}</p>
                </div>

                {/* Time */}
                <div className="text-right min-w-[100px]">
                  <p className="text-sm text-gray-400">{timeAgo(tx.createdAt)}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{formatDate(tx.createdAt)}</p>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-gray-500">Belum ada transaksi</p>
              <button onClick={() => handleOpenForm('in')} className="btn-primary mt-4">
                Tambah Transaksi Pertama
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Form Modal ────────────────────────────────── */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={formType === 'in' ? '📦 Stock Masuk' : '📤 Stock Keluar'}>
        <div className="space-y-4">
          {/* Product selector */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Pilih Produk</label>
            <select className="select w-full" value={formProduct} onChange={e => setFormProduct(e.target.value)}>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Stok: {p.quantity} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Jumlah</label>
            <input
              type="number"
              className="input w-full"
              placeholder="0"
              min="1"
              value={formQty || ''}
              onChange={e => setFormQty(parseInt(e.target.value) || 0)}
            />
            {formType === 'out' && formProduct && (
              <p className="text-xs text-gray-500 mt-1">
                Stok saat ini: {products.find(p => p.id === formProduct)?.quantity || 0}
                {formQty > (products.find(p => p.id === formProduct)?.quantity || 0) && (
                  <span className="text-red-400 ml-2">⚠ Melebihi stok!</span>
                )}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Catatan (opsional)</label>
            <input
              type="text"
              className="input w-full"
              placeholder={formType === 'in' ? 'Contoh: Restock dari supplier...' : 'Contoh: Penjualan online...'}
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
            />
          </div>

          {/* Preview */}
          {formProduct && formQty > 0 && (
            <div className="p-4 bg-[#222632] rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Preview:</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">
                  {products.find(p => p.id === formProduct)?.name}
                </span>
                <span className={`text-sm font-semibold ${formType === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formType === 'in' ? '+' : '-'}{formQty} → {
                    formType === 'in'
                      ? (products.find(p => p.id === formProduct)?.quantity || 0) + formQty
                      : Math.max(0, (products.find(p => p.id === formProduct)?.quantity || 0) - formQty)
                  } {products.find(p => p.id === formProduct)?.unit}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2e3a]">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
            <button
              onClick={handleSave}
              className={formType === 'in' ? 'btn-success' : 'btn-danger'}
              disabled={!formProduct || formQty <= 0}
            >
              {formType === 'in' ? '↓ Tambah Stok' : '↑ Kurangi Stok'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
