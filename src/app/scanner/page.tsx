'use client'

import { useState, useEffect, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Product, Transaction } from '@/lib/types'
import { getProducts, addTransaction } from '@/lib/store'

const BarcodeScannerWidget = dynamic(
  () => import('@/components/BarcodeScannerWidget'),
  { ssr: false, loading: () => <ScannerPlaceholder /> }
)

function ScannerPlaceholder() {
  return (
    <div className="w-full max-w-md aspect-square rounded-2xl border-2 border-[#2a2e3a] bg-[#1a1d27] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Memuat scanner...</p>
      </div>
    </div>
  )
}

function formatRupiah(num: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
}

interface ScanHistoryItem {
  sku: string
  productName: string
  timestamp: string
  type: 'in' | 'out' | 'found' | 'not_found'
  quantity?: number
}

export default function ScannerPage() {
  const [mounted, setMounted] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState('Siap')
  const [manualSku, setManualSku] = useState('')

  // Product search state
  const [foundProduct, setFoundProduct] = useState<Product | null>(null)
  const [notFoundSku, setNotFoundSku] = useState<string | null>(null)

  // Quick action state
  const [customInQty, setCustomInQty] = useState('')
  const [customOutQty, setCustomOutQty] = useState('')
  const [lastAction, setLastAction] = useState<{ type: 'in' | 'out'; quantity: number } | null>(null)

  // Scan history
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])

  // Force re-render of product after stock update
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lookup product by SKU
  const lookupProduct = useCallback((sku: string) => {
    const trimmed = sku.trim()
    if (!trimmed) return

    const products = getProducts()
    const product = products.find(p => p.sku.toLowerCase() === trimmed.toLowerCase())

    if (product) {
      // Re-fetch to get latest quantity
      const fresh = getProducts().find(p => p.id === product.id) || product
      setFoundProduct(fresh)
      setNotFoundSku(null)
      setLastAction(null)
      setCustomInQty('')
      setCustomOutQty('')

      // Add to scan history
      const historyItem: ScanHistoryItem = {
        sku: fresh.sku,
        productName: fresh.name,
        timestamp: new Date().toISOString(),
        type: 'found',
      }
      setScanHistory(prev => [historyItem, ...prev].slice(0, 10))
    } else {
      setFoundProduct(null)
      setNotFoundSku(trimmed)

      const historyItem: ScanHistoryItem = {
        sku: trimmed,
        productName: 'Tidak ditemukan',
        timestamp: new Date().toISOString(),
        type: 'not_found',
      }
      setScanHistory(prev => [historyItem, ...prev].slice(0, 10))
    }

    setRefreshKey(k => k + 1)
  }, [])

  // Handle barcode scan
  const handleScan = useCallback((decodedText: string) => {
    lookupProduct(decodedText)
  }, [lookupProduct])

  // Handle manual search
  const handleManualSearch = () => {
    if (manualSku.trim()) {
      lookupProduct(manualSku.trim())
    }
  }

  // Stock in/out action
  const handleStockAction = (type: 'in' | 'out', quantity: number) => {
    if (!foundProduct || quantity <= 0) return

    // Prevent going below zero
    if (type === 'out' && quantity > foundProduct.quantity) {
      return
    }

    const transaction: Transaction = {
      id: uuid(),
      productId: foundProduct.id,
      type,
      quantity,
      notes: `Stock ${type === 'in' ? 'Masuk' : 'Keluar'} via Scanner`,
      createdAt: new Date().toISOString(),
    }

    addTransaction(transaction)

    // Update local product state
    const updatedProducts = getProducts()
    const updatedProduct = updatedProducts.find(p => p.id === foundProduct.id)
    if (updatedProduct) {
      setFoundProduct(updatedProduct)
    }

    setLastAction({ type, quantity })
    setRefreshKey(k => k + 1)

    // Add to history
    const historyItem: ScanHistoryItem = {
      sku: foundProduct.sku,
      productName: foundProduct.name,
      timestamp: new Date().toISOString(),
      type,
      quantity,
    }
    setScanHistory(prev => [historyItem, ...prev].slice(0, 10))
  }

  const handleCustomIn = () => {
    const qty = parseInt(customInQty)
    if (qty > 0) {
      handleStockAction('in', qty)
      setCustomInQty('')
    }
  }

  const handleCustomOut = () => {
    const qty = parseInt(customOutQty)
    if (qty > 0) {
      handleStockAction('out', qty)
      setCustomOutQty('')
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#1a1d27] rounded-lg animate-pulse" />
        <div className="card h-80 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            Barcode Scanner
          </h1>
          <p className="text-gray-500 mt-1 ml-[52px]">Pindai barcode atau masukkan SKU manual</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Scanner + Manual Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner Card */}
          <div className="card">
            <div className="flex flex-col items-center gap-5">
              <BarcodeScannerWidget
                onScan={handleScan}
                isScanning={isScanning}
                onStatusChange={setScanStatus}
              />

              {/* Start/Stop button */}
              <button
                onClick={() => setIsScanning(!isScanning)}
                className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                  isScanning
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                }`}
              >
                {isScanning ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    Hentikan Scan
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mulai Scan
                  </>
                )}
              </button>
              <p className="text-xs text-gray-600 text-center">Status: {scanStatus}</p>
            </div>
          </div>

          {/* Manual SKU Input */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Input Manual SKU
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                className="input flex-1 font-mono"
                placeholder="Masukkan SKU (contoh: KOP-001)"
                value={manualSku}
                onChange={e => setManualSku(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
              />
              <button
                onClick={handleManualSearch}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
                disabled={!manualSku.trim()}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Cari
              </button>
            </div>
          </div>

          {/* Product Found / Not Found */}
          {foundProduct && (
            <ProductCard
              key={refreshKey}
              product={foundProduct}
              onStockAction={handleStockAction}
              customInQty={customInQty}
              onCustomInQtyChange={setCustomInQty}
              onCustomIn={handleCustomIn}
              customOutQty={customOutQty}
              onCustomOutQtyChange={setCustomOutQty}
              onCustomOut={handleCustomOut}
              lastAction={lastAction}
            />
          )}

          {notFoundSku && !foundProduct && (
            <div className="card border-amber-500/20">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="text-lg font-semibold text-amber-400 mb-1">Produk tidak ditemukan</h3>
                <p className="text-gray-400 text-sm mb-4">
                  SKU <span className="font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{notFoundSku}</span> tidak terdaftar dalam sistem
                </p>
                <Link
                  href={`/products?add=true&sku=${encodeURIComponent(notFoundSku)}`}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Produk Baru
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Scan History */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Riwayat Scan
            </h3>

            {scanHistory.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-600 text-sm">Belum ada riwayat scan</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {scanHistory.map((item, idx) => (
                  <div
                    key={`${item.sku}-${item.timestamp}-${idx}`}
                    className="p-3 rounded-xl bg-[#222632] border border-[#2a2e3a] hover:border-indigo-500/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.type === 'found' && <span className="badge-success text-[10px]">Ditemukan</span>}
                          {item.type === 'not_found' && <span className="badge-warning text-[10px]">Tidak Ditemukan</span>}
                          {item.type === 'in' && <span className="badge-success text-[10px]">+{item.quantity} Masuk</span>}
                          {item.type === 'out' && <span className="badge-danger text-[10px]">-{item.quantity} Keluar</span>}
                        </div>
                        <p className="text-sm font-mono text-gray-300 truncate">{item.sku}</p>
                        <p className="text-xs text-gray-500 truncate">{item.productName}</p>
                      </div>
                      <span className="text-[10px] text-gray-600 whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick tips */}
          <div className="card !bg-indigo-600/5 border-indigo-500/10">
            <h3 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tips
            </h3>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                Arahkan kamera ke barcode barang
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                Pastikan barcode dalam kondisi baik dan terang
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                Jika kamera tidak tersedia, gunakan input manual SKU
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                Jarak ideal pemindaian: 10-30 cm
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Scan line animation */}
      <style jsx global>{`
        .scan-line {
          animation: scanSweep 2s ease-in-out infinite;
        }
        @keyframes scanSweep {
          0% { top: 10%; }
          50% { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  )
}

// ─── Product Card Component ─────────────────────────
function ProductCard({
  product,
  onStockAction,
  customInQty,
  onCustomInQtyChange,
  onCustomIn,
  customOutQty,
  onCustomOutQtyChange,
  onCustomOut,
  lastAction,
}: {
  product: Product
  onStockAction: (type: 'in' | 'out', qty: number) => void
  customInQty: string
  onCustomInQtyChange: (val: string) => void
  onCustomIn: () => void
  customOutQty: string
  onCustomOutQtyChange: (val: string) => void
  onCustomOut: () => void
  lastAction: { type: 'in' | 'out'; quantity: number } | null
}) {
  const isLow = product.quantity <= product.minStock && product.quantity > 0
  const isOut = product.quantity === 0

  return (
    <div className="card border-indigo-500/20">
      {/* Success notification */}
      {lastAction && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
          lastAction.type === 'in'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {lastAction.type === 'in' ? 'Stok masuk' : 'Stok keluar'}: {lastAction.quantity} unit
        </div>
      )}

      {/* Product Info */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-14 h-14 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
          <span className="text-2xl">📦</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{product.name}</h3>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{product.sku}</p>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
          isOut ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'
        }`}>
          {isOut ? 'HABIS' : isLow ? 'MENIPIS' : 'OK'}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-[#222632] rounded-lg p-3 border border-[#2a2e3a]">
          <p className="text-xs text-gray-500 mb-1">Kategori</p>
          <p className="text-sm text-gray-200">{product.category}</p>
        </div>
        <div className="bg-[#222632] rounded-lg p-3 border border-[#2a2e3a]">
          <p className="text-xs text-gray-500 mb-1">Stok Saat Ini</p>
          <p className={`text-sm font-bold ${
            isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {product.quantity} <span className="text-xs font-normal text-gray-500">{product.unit}</span>
          </p>
        </div>
        <div className="bg-[#222632] rounded-lg p-3 border border-[#2a2e3a]">
          <p className="text-xs text-gray-500 mb-1">Harga Jual</p>
          <p className="text-sm text-indigo-400 font-medium">{formatRupiah(product.price)}</p>
        </div>
        <div className="bg-[#222632] rounded-lg p-3 border border-[#2a2e3a]">
          <p className="text-xs text-gray-500 mb-1">Nilai Stok</p>
          <p className="text-sm text-gray-200 font-medium">{formatRupiah(product.price * product.quantity)}</p>
        </div>
      </div>

      {/* Stock In */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Stock Masuk
        </p>
        <div className="flex flex-wrap gap-2">
          {[1, 5, 10].map(qty => (
            <button
              key={`in-${qty}`}
              onClick={() => onStockAction('in', qty)}
              className="btn-success !px-4 !py-2 text-sm"
            >
              +{qty}
            </button>
          ))}
          <div className="flex gap-2">
            <input
              type="number"
              className="input !py-2 w-20 text-sm text-center"
              placeholder="Qty"
              value={customInQty}
              onChange={e => onCustomInQtyChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onCustomIn()}
              min="1"
            />
            <button
              onClick={onCustomIn}
              className="btn-success !px-3 !py-2 text-sm"
              disabled={!customInQty || parseInt(customInQty) <= 0}
            >
              +Custom
            </button>
          </div>
        </div>
      </div>

      {/* Stock Out */}
      <div>
        <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
          Stock Keluar
        </p>
        <div className="flex flex-wrap gap-2">
          {[1, 5, 10].map(qty => (
            <button
              key={`out-${qty}`}
              onClick={() => onStockAction('out', qty)}
              className="btn-danger !px-4 !py-2 text-sm"
              disabled={qty > product.quantity}
            >
              -{qty}
            </button>
          ))}
          <div className="flex gap-2">
            <input
              type="number"
              className="input !py-2 w-20 text-sm text-center"
              placeholder="Qty"
              value={customOutQty}
              onChange={e => onCustomOutQtyChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onCustomOut()}
              min="1"
              max={product.quantity}
            />
            <button
              onClick={onCustomOut}
              className="btn-danger !px-3 !py-2 text-sm"
              disabled={!customOutQty || parseInt(customOutQty) <= 0}
            >
              -Custom
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
