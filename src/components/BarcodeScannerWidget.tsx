'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (decodedText: string) => void
  isScanning: boolean
  onStatusChange?: (status: string) => void
}

const SCAN_REGION_ID = 'barcode-reader-region'

export default function BarcodeScannerWidget({ onScan, isScanning, onStatusChange }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [lastResult, setLastResult] = useState('')
  const [error, setError] = useState('')
  const isStartingRef = useRef(false)
  const isStoppingRef = useRef(false)

  const startScanner = useCallback(async () => {
    if (isStartingRef.current || scannerRef.current) return
    isStartingRef.current = true
    setError('')
    onStatusChange?.('Memulai kamera...')

    try {
      const scanner = new Html5Qrcode(SCAN_REGION_ID)
      scannerRef.current = scanner

      const cameras = await Html5Qrcode.getCameras()
      if (!cameras || cameras.length === 0) {
        setError('Tidak ada kamera ditemukan')
        onStatusChange?.('Kamera tidak tersedia')
        isStartingRef.current = false
        return
      }

      // Prefer back camera on mobile
      const cameraId = cameras.length > 1 ? cameras[cameras.length - 1].id : cameras[0].id

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setLastResult(decodedText)
          onScan(decodedText)
          onStatusChange?.(`Terdeteksi: ${decodedText}`)
        },
        () => { /* ignore errors during scan */ }
      )

      onStatusChange?.('Siap memindai')
    } catch (err: any) {
      console.error('Scanner start error:', err)
      setError(err?.message || 'Gagal memulai kamera')
      onStatusChange?.('Error kamera')
      // Cleanup on error
      if (scannerRef.current) {
        try { await scannerRef.current.stop() } catch { /* ignore */ }
        scannerRef.current = null
      }
    } finally {
      isStartingRef.current = false
    }
  }, [onScan, onStatusChange])

  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return
    isStoppingRef.current = true
    onStatusChange?.('Menghentikan kamera...')

    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState()
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop()
        }
      }
    } catch (err) {
      console.warn('Scanner stop warning:', err)
    } finally {
      if (scannerRef.current) {
        try { scannerRef.current.clear() } catch { /* ignore */ }
        scannerRef.current = null
      }
      isStoppingRef.current = false
      onStatusChange?.('Kamera dihentikan')
    }
  }, [onStatusChange])

  useEffect(() => {
    if (isScanning) {
      startScanner()
    } else {
      stopScanner()
    }
  }, [isScanning, startScanner, stopScanner])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState()
          if (state === 2) {
            scannerRef.current.stop().then(() => {
              scannerRef.current?.clear()
              scannerRef.current = null
            }).catch(() => {
              try { scannerRef.current?.clear() } catch { /* ignore */ }
              scannerRef.current = null
            })
          }
        } catch {
          try { scannerRef.current?.clear() } catch { /* ignore */ }
          scannerRef.current = null
        }
      }
    }
  }, [])

  return (
    <div className="flex flex-col items-center">
      {/* Scanner viewport */}
      <div
        id={SCAN_REGION_ID}
        className={`relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
          isScanning
            ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.15)]'
            : 'border-[#2a2e3a]'
        }`}
        style={{ minHeight: '250px' }}
      >
        {/* Scanning overlay animation */}
        {isScanning && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Corner markers */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
            {/* Scan line */}
            <div className="scan-line absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
          </div>
        )}

        {/* Idle state overlay */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0f1117]/80 z-10">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-gray-500 text-sm">Klik tombol untuk memulai</p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center max-w-md">
          ⚠️ {error}
        </div>
      )}

      {/* Last scan result */}
      {lastResult && (
        <div className="mt-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 text-sm text-center max-w-md font-mono">
          Hasil terakhir: <span className="font-bold">{lastResult}</span>
        </div>
      )}
    </div>
  )
}
