'use client'

import { useState, useEffect } from 'react'
import { getCategories, addCategory, updateCategory, deleteCategory, getProducts } from '@/lib/store'
import { Category } from '@/lib/types'
import Modal from '@/components/Modal'
import { v4 as uuid } from 'uuid'

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#64748b', '#78716c',
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [mounted, setMounted] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Category | null>(null)

  // Form
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0])

  useEffect(() => {
    setCategories(getCategories())
    setMounted(true)
  }, [])

  const reload = () => setCategories(getCategories())

  // Count products per category
  const products = getProducts()
  const catCounts: Record<string, number> = {}
  products.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1 })

  const openAdd = () => {
    setEditCategory(null)
    setFormName('')
    setFormColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)])
    setShowForm(true)
  }

  const openEdit = (cat: Category) => {
    setEditCategory(cat)
    setFormName(cat.name)
    setFormColor(cat.color)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!formName.trim()) return
    if (editCategory) {
      updateCategory(editCategory.id, { name: formName, color: formColor })
    } else {
      addCategory({ id: uuid(), name: formName, color: formColor })
    }
    setShowForm(false)
    reload()
  }

  const handleDelete = (cat: Category) => {
    if ((catCounts[cat.name] || 0) > 0) {
      alert(`Tidak bisa hapus "${cat.name}" — masih ada ${catCounts[cat.name]} produk di kategori ini.`)
      setShowDeleteConfirm(null)
      return
    }
    deleteCategory(cat.id)
    setShowDeleteConfirm(null)
    reload()
  }

  if (!mounted) return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="card h-20" />)}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kategori</h1>
          <p className="text-gray-500 mt-1">{categories.length} kategori aktif</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tambah Kategori
        </button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const count = catCounts[cat.name] || 0
          const totalValue = products
            .filter(p => p.category === cat.name)
            .reduce((sum, p) => sum + (p.price * p.quantity), 0)

          return (
            <div key={cat.id} className="card hover:border-indigo-500/20 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '25' }}>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{cat.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{count} produk</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="p-2 rounded-lg hover:bg-[#222632] text-gray-400 hover:text-indigo-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setShowDeleteConfirm(cat)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              {count > 0 && (
                <div className="mt-4 pt-4 border-t border-[#2a2e3a]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Nilai stok</span>
                    <span className="text-indigo-400 font-medium">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalValue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ─── Add/Edit Modal ────────────────────────────── */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editCategory ? 'Edit Kategori' : 'Tambah Kategori'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nama Kategori</label>
            <input
              type="text"
              className="input w-full"
              placeholder="Contoh: Elektronik"
              value={formName}
              onChange={e => setFormName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Warna</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  onClick={() => setFormColor(color)}
                  className={`w-8 h-8 rounded-lg transition-all ${formColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1d27] scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-[#222632] rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: formColor + '25' }}>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: formColor }} />
            </div>
            <div>
              <p className="font-medium text-white">{formName || 'Nama Kategori'}</p>
              <p className="text-xs text-gray-500">0 produk</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2e3a]">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
            <button onClick={handleSave} className="btn-primary" disabled={!formName.trim()}>
              {editCategory ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirm ────────────────────────────── */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Hapus Kategori" size="sm">
        <div className="space-y-4">
          <p className="text-gray-300">
            Yakin mau hapus kategori <span className="font-semibold text-white">{showDeleteConfirm?.name}</span>?
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
