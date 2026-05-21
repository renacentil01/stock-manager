'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { Product } from '@/lib/types'
import { getProducts } from '@/lib/store'

function formatRupiah(num: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
}

// ─── Single Barcode Component ──────────────────────
function BarcodeDisplay({ sku, format }: { sku: string; format: 'CODE128' | 'EAN13' }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current && sku) {
      try {
        JsBarcode(svgRef.current, sku, {
          format: format === 'EAN13' ? 'EAN13' : 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
          textMargin: 4,
        })
      } catch {
        // EAN13 requires 12-13 numeric digits, fall back to CODE128
        if (svgRef.current) {
          JsBarcode(svgRef.current, sku, {
            format: 'CODE128',
            width: 2,
            height: 50,
            displayValue: true,
            font: 'monospace',
            fontSize: 14,
            textMargin: 4,
          })
        }
      }
    }
  }, [sku, format])

  return <svg ref={svgRef} className="w-full" />
}

// ─── QR Code Component ─────────────────────────────
function QRCodeDisplay({ product }: { product: Product }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const generate = async () => {
      const text = JSON.stringify({
        name: product.name,
        sku: product.sku,
        price: product.price,
        category: product.category,
      })
      const url = await QRCode.toDataURL(text, { width: 200, margin: 2 })
      setDataUrl(url)
    }
    if (product) generate()
  }, [product])

  if (!dataUrl) return <div className="w-[200px] h-[200px] bg-gray-800 rounded-lg animate-pulse" />
  return <img src={dataUrl} alt={`QR Code - ${product.name}`} className="rounded-lg" />
}

// ─── Label Component ───────────────────────────────
function ProductLabel({
  product,
  format,
}: {
  product: Product
  format: 'CODE128' | 'EAN13'
}) {
  return (
    <div className="print-label">
      <div className="label-content">
        <div className="label-header">{product.name}</div>
        <div className="label-barcode">
          <BarcodeDisplay sku={product.sku} format={format} />
        </div>
        <div className="label-details">
          <div className="label-price">{formatRupiah(product.price)}</div>
          <div className="label-category">{product.category}</div>
          {product.expiryDate && (
            <div className="label-expiry">
              Exp: {new Date(product.expiryDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          )}
          <div className="label-sku">SKU: {product.sku}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────
export default function BarcodePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [format, setFormat] = useState<'CODE128' | 'EAN13'>('CODE128')
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setProducts(getProducts())
    setMounted(true)
  }, [])

  const selectedProduct = products.find((p) => p.id === selectedId)

  const handleBulkToggle = useCallback((id: string) => {
    setBulkSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    if (bulkSelected.length === products.length) {
      setBulkSelected([])
    } else {
      setBulkSelected(products.map((p) => p.id))
    }
  }, [products, bulkSelected.length])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-lg">Memuat...</div>
      </div>
    )
  }

  return (
    <>
      {/* ── Print-only div ────────────────────────── */}
      <div className="print-only">
        {mode === 'single' && selectedProduct && (
          <ProductLabel product={selectedProduct} format={format} />
        )}
        {mode === 'bulk' &&
          bulkSelected.map((id) => {
            const p = products.find((x) => x.id === id)
            if (!p) return null
            return (
              <ProductLabel key={p.id} product={p} format={format} />
            )
          })}
      </div>

      {/* ── Screen UI ─────────────────────────────── */}
      <div className="space-y-6 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Barcode Generator</h1>
            <p className="text-gray-500 mt-1">Generate barcode, QR code, dan cetak label produk</p>
          </div>
        </div>

        {/* Controls */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mode toggle */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('single')}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                    mode === 'single'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#222632] text-gray-400 hover:text-gray-200 border border-[#2a2e3a]'
                  }`}
                >
                  📦 Satuan
                </button>
                <button
                  onClick={() => setMode('bulk')}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                    mode === 'bulk'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#222632] text-gray-400 hover:text-gray-200 border border-[#2a2e3a]'
                  }`}
                >
                  📋 Bulk
                </button>
              </div>
            </div>

            {/* Barcode format */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Format Barcode</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'CODE128' | 'EAN13')}
                className="select w-full"
              >
                <option value="CODE128">Code128</option>
                <option value="EAN13">EAN-13</option>
              </select>
            </div>

            {/* Print button */}
            <div className="flex items-end">
              <button
                onClick={handlePrint}
                disabled={mode === 'single' ? !selectedProduct : bulkSelected.length === 0}
                className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Label
                {mode === 'bulk' && bulkSelected.length > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {bulkSelected.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {format === 'EAN13' && (
            <p className="mt-3 text-xs text-amber-400 flex items-center gap-1.5">
              <span>⚠️</span>
              EAN-13 membutuhkan 12-13 digit angka. SKU non-numeric akan otomatis menggunakan Code128.
            </p>
          )}
        </div>

        {/* Single mode: Product selector + preview */}
        {mode === 'single' && (
          <>
            <div className="card">
              <label className="block text-sm text-gray-400 mb-2">Pilih Produk</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="select w-full"
              >
                <option value="">— Pilih produk —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              {products.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">Belum ada produk. Tambah produk terlebih dahulu.</p>
              )}
            </div>

            {selectedProduct && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Barcode + Info */}
                <div className="card space-y-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-indigo-400">▎</span> Barcode
                  </h2>
                  <div className="bg-white rounded-xl p-4">
                    <BarcodeDisplay sku={selectedProduct.sku} format={format} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Nama</span>
                      <span className="text-gray-200">{selectedProduct.name}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>SKU</span>
                      <span className="text-gray-200 font-mono">{selectedProduct.sku}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Harga</span>
                      <span className="text-indigo-400 font-semibold">{formatRupiah(selectedProduct.price)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Kategori</span>
                      <span className="text-gray-200">{selectedProduct.category}</span>
                    </div>
                    {selectedProduct.expiryDate && (
                      <div className="flex justify-between text-gray-400">
                        <span>Expiry</span>
                        <span className="text-amber-400">
                          {new Date(selectedProduct.expiryDate).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                <div className="card space-y-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-indigo-400">▎</span> QR Code
                  </h2>
                  <div className="flex justify-center">
                    <QRCodeDisplay product={selectedProduct} />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    QR berisi informasi produk: nama, SKU, harga, dan kategori
                  </p>
                </div>

                {/* Label Preview */}
                <div className="card space-y-4 lg:col-span-2">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-indigo-400">▎</span> Preview Label (80mm × 50mm)
                  </h2>
                  <div className="flex justify-center">
                    <div
                      className="border border-dashed border-[#3a3e4a] rounded-xl p-6 bg-[#0f1117]"
                      style={{ width: '302px' }}
                    >
                      <ProductLabel product={selectedProduct} format={format} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Bulk mode: Multi-select */}
        {mode === 'bulk' && (
          <>
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Pilih Produk untuk Dicetak</h2>
                <button onClick={handleSelectAll} className="btn-secondary text-sm">
                  {bulkSelected.length === products.length ? 'Batalkan Semua' : 'Pilih Semua'}
                </button>
              </div>

              {products.length === 0 ? (
                <p className="text-gray-500">Belum ada produk.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {products.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        bulkSelected.includes(p.id)
                          ? 'bg-indigo-600/10 border-indigo-500/30'
                          : 'bg-[#222632]/50 border-[#2a2e3a] hover:border-[#3a3e4a]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={bulkSelected.includes(p.id)}
                        onChange={() => handleBulkToggle(p.id)}
                        className="w-4 h-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-[#1a1d27]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-200 font-medium truncate">{p.name}</span>
                          <span className="text-xs text-gray-500 font-mono">{p.sku}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {p.category} · {formatRupiah(p.price)}
                          {p.expiryDate && (
                            <span className="text-amber-400 ml-2">
                              Exp: {new Date(p.expiryDate).toLocaleDateString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Bulk preview thumbnails */}
            {bulkSelected.length > 0 && (
              <div className="card space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Preview ({bulkSelected.length} label)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bulkSelected.map((id) => {
                    const p = products.find((x) => x.id === id)
                    if (!p) return null
                    return (
                      <div
                        key={p.id}
                        className="bg-[#0f1117] border border-[#2a2e3a] rounded-xl p-4 space-y-3"
                      >
                        <div className="bg-white rounded-lg p-2">
                          <BarcodeDisplay sku={p.sku} format={format} />
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-200 font-medium truncate">{p.name}</div>
                          <div className="text-sm text-indigo-400">{formatRupiah(p.price)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
