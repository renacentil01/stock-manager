'use client'

import { useState, useEffect, useMemo } from 'react'
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories } from '@/lib/store'
import { Product, UNITS } from '@/lib/types'
import Modal from '@/components/Modal'
import { v4 as uuid } from 'uuid'
import { getExpiryStatus, getDaysUntilExpiry, getExpiryLabel, sortByExpiry } from '@/lib/expiry'

function formatRupiah(num: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
}

type SortKey = 'name' | 'quantity' | 'price' | 'createdAt' | 'expiry'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('Semua')
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all')
  const [filterExpiry, setFilterExpiry] = useState<'all' | 'expired' | 'expiring_soon'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Modal states
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Product | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '', sku: '', category: '', price: 0, cost: 0,
    quantity: 0, minStock: 5, unit: 'pcs', description: '', expiryDate: ''
  })

  const categories = getCategories()

  useEffect(() => {
    setProducts(getProducts())
    setMounted(true)
  }, [])

  const reload = () => setProducts(getProducts())

  // Filtered + sorted products
  const filtered = useMemo(() => {
    let list = [...products]

    // Search
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.sku.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s)
      )
    }

    // Category filter
    if (filterCategory !== 'Semua') {
      list = list.filter(p => p.category === filterCategory)
    }

    // Stock filter
    if (filterStock === 'low') list = list.filter(p => p.quantity > 0 && p.quantity <= p.minStock)
    if (filterStock === 'out') list = list.filter(p => p.quantity === 0)

    // Expiry filter
    if (filterExpiry === 'expired') list = list.filter(p => getExpiryStatus(p.expiryDate) === 'expired')
    if (filterExpiry === 'expiring_soon') list = list.filter(p => getExpiryStatus(p.expiryDate) === 'expiring_soon')

    // Sort
    if (sortKey === 'expiry') {
      list = sortByExpiry(list)
    } else {
      list.sort((a, b) => {
        const aVal = String(a[sortKey])
        const bVal = String(b[sortKey])
        if (sortKey === 'quantity' || sortKey === 'price') {
          const aNum = Number(a[sortKey])
          const bNum = Number(b[sortKey])
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum
        }
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    }

    return list
  }, [products, search, filterCategory, filterStock, filterExpiry, sortKey, sortDir])

  // ─── Form Handlers ──────────────────────────────────
  const openAdd = () => {
    setEditProduct(null)
    setForm({ name: '', sku: '', category: categories[0]?.name || '', price: 0, cost: 0, quantity: 0, minStock: 5, unit: 'pcs', description: '', expiryDate: '' })
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditProduct(p)
    setForm({ name: p.name, sku: p.sku, category: p.category, price: p.price, cost: p.cost, quantity: p.quantity, minStock: p.minStock, unit: p.unit, description: p.description, expiryDate: p.expiryDate ? p.expiryDate.split('T')[0] : '' })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.sku.trim()) return

    const expiryVal = form.expiryDate ? new Date(form.expiryDate).toISOString() : null
    if (editProduct) {
      updateProduct(editProduct.id, { ...form, expiryDate: expiryVal })
    } else {
      addProduct({ id: uuid(), ...form, expiryDate: expiryVal, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }
    setShowForm(false)
    reload()
  }

  const handleDelete = (p: Product) => {
    deleteProduct(p.id)
    setShowDeleteConfirm(null)
    reload()
  }

  // ─── Export CSV ──────────────────────────────────────
  const exportCSV = () => {
    const headers = ['SKU', 'Nama', 'Kategori', 'Harga', 'Modal', 'Stok', 'Min Stok', 'Satuan', 'Tanggal Kadaluarsa']
    const rows = filtered.map(p => [p.sku, p.name, p.category, p.price, p.cost, p.quantity, p.minStock, p.unit, p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('id-ID') : ''])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'produk.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  if (!mounted) return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="card h-16" />)}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Produk</h1>
          <p className="text-gray-500 mt-1">{filtered.length} dari {products.length} produk</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export CSV
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card !p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="🔍  Cari nama, SKU, atau deskripsi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="select"
          >
            <option value="Semua">Semua Kategori</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select
            value={filterStock}
            onChange={e => setFilterStock(e.target.value as typeof filterStock)}
            className="select"
          >
            <option value="all">Semua Stok</option>
            <option value="low">Stok Menipis</option>
            <option value="out">Stok Habis</option>
          </select>
          <select
            value={filterExpiry}
            onChange={e => setFilterExpiry(e.target.value as typeof filterExpiry)}
            className="select"
          >
            <option value="all">Semua Kedaluwarsa</option>
            <option value="expired">🔴 Kedaluarsa</option>
            <option value="expiring_soon">🟡 Segera Kedaluarsa</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#222632]">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('name')}>
                  Produk {sortKey === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">SKU</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Kategori</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('price')}>
                  Harga {sortKey === 'price' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('quantity')}>
                  Stok {sortKey === 'quantity' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('expiry')}>
                  Kedaluwarsa {sortKey === 'expiry' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Nilai</th>
                <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isLow = p.quantity <= p.minStock && p.quantity > 0
                const isOut = p.quantity === 0
                const expiryStatus = getExpiryStatus(p.expiryDate)
                const daysLeft = getDaysUntilExpiry(p.expiryDate)
                return (
                  <tr key={p.id} className="table-row">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-200">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{p.sku}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#222632] text-gray-300 border border-[#2a2e3a]">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">{formatRupiah(p.price)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${
                        isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {isOut && '⊘ '}{isLow && '⚠ '}
                        {p.quantity} <span className="text-gray-500 font-normal">{p.unit}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {p.expiryDate ? (
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            expiryStatus === 'expired' ? 'bg-red-500/20 text-red-400' :
                            expiryStatus === 'expiring_soon' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {expiryStatus === 'expired' && '🔴 EXPIRED'}
                            {expiryStatus === 'expiring_soon' && '🟡 EXP. SOON'}
                            {expiryStatus === 'safe' && '🟢 SAFE'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(p.expiryDate).toLocaleDateString('id-ID')}
                          </span>
                          <span className={`text-xs ${expiryStatus === 'expired' ? 'text-red-400' : expiryStatus === 'expiring_soon' ? 'text-amber-400' : 'text-gray-500'}`}>
                            {daysLeft !== null ? getExpiryLabel(p.expiryDate) : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-indigo-400 text-right font-medium">{formatRupiah(p.price * p.quantity)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-[#222632] text-gray-400 hover:text-indigo-400 transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setShowDeleteConfirm(p)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors" title="Hapus">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-3xl mb-2">📦</p>
                    <p>Tidak ada produk ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add/Edit Modal ────────────────────────────── */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editProduct ? 'Edit Produk' : 'Tambah Produk'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Nama Produk *</label>
              <input type="text" className="input w-full" placeholder="Contoh: Kopi Arabica 250g" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">SKU *</label>
              <input type="text" className="input w-full font-mono" placeholder="KOP-001" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Kategori</label>
              <select className="select w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Satuan</label>
              <select className="select w-full" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Harga Jual (Rp)</label>
              <input type="number" className="input w-full" placeholder="0" value={form.price || ''} onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Modal (Rp)</label>
              <input type="number" className="input w-full" placeholder="0" value={form.cost || ''} onChange={e => setForm({ ...form, cost: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Stok Minimum</label>
              <input type="number" className="input w-full" placeholder="5" value={form.minStock || ''} onChange={e => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Deskripsi</label>
            <textarea className="input w-full resize-none" rows={2} placeholder="Deskripsi singkat produk..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Tanggal Kadaluarsa (opsional)</label>
            <input type="date" className="input w-full" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2e3a]">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
            <button onClick={handleSave} className="btn-primary" disabled={!form.name.trim() || !form.sku.trim()}>
              {editProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirm ────────────────────────────── */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Hapus Produk" size="sm">
        <div className="space-y-4">
          <p className="text-gray-300">
            Yakin mau hapus <span className="font-semibold text-white">{showDeleteConfirm?.name}</span>? Semua transaksi terkait juga akan terhapus.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Batal</button>
            <button onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} className="btn-danger">Hapus</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
