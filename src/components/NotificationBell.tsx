'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getProducts } from '@/lib/store'
import { Product } from '@/lib/types'
import Link from 'next/link'

const READ_KEY = 'stock_manager_notifications_read'
const PERMISSION_KEY = 'stock_manager_notification_permission'

interface LowStockNotification {
  id: string
  productName: string
  sku: string
  currentStock: number
  minStock: number
  severity: 'danger' | 'warning'
}

function getReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const data = localStorage.getItem(READ_KEY)
    return new Set(data ? JSON.parse(data) : [])
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)))
}

function generateNotifications(products: Product[]): LowStockNotification[] {
  return products
    .filter(p => p.quantity <= p.minStock)
    .map(p => ({
      id: p.id,
      productName: p.name,
      sku: p.sku,
      currentStock: p.quantity,
      minStock: p.minStock,
      severity: p.quantity === 0 ? 'danger' : 'warning',
    }))
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<LowStockNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const previousZeroStockRef = useRef<Set<string>>(new Set())

  // Refresh notifications
  const refresh = useCallback(() => {
    const products = getProducts()
    const notifs = generateNotifications(products)
    setNotifications(notifs)
    setReadIds(getReadIds())

    // Send browser notification for newly zero-stock items
    if ('Notification' in window && Notification.permission === 'granted') {
      const currentZero = new Set(notifs.filter(n => n.severity === 'danger').map(n => n.id))
      for (const n of notifs.filter(n => n.severity === 'danger')) {
        if (!previousZeroStockRef.current.has(n.id)) {
          try {
            new Notification('⚠️ Stok Habis!', {
              body: `${n.productName} (${n.sku}) stok sudah habis!`,
              icon: '/favicon.ico',
            })
          } catch {
            // Notification failed silently
          }
        }
      }
      previousZeroStockRef.current = currentZero
    }
  }, [])

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    setMounted(true)
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  // Request browser notification permission once
  useEffect(() => {
    if (!mounted) return
    if ('Notification' in window && Notification.permission === 'default') {
      const asked = localStorage.getItem(PERMISSION_KEY)
      if (!asked) {
        localStorage.setItem(PERMISSION_KEY, 'asked')
        // Delay request slightly so it's not blocked
        setTimeout(() => {
          Notification.requestPermission().catch(() => {})
        }, 3000)
      }
    }
  }, [mounted])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length

  function handleMarkAsRead(id: string) {
    const newRead = new Set(readIds)
    newRead.add(id)
    setReadIds(newRead)
    saveReadIds(newRead)
  }

  function handleMarkAllRead() {
    const newRead = new Set(readIds)
    notifications.forEach(n => newRead.add(n.id))
    setReadIds(newRead)
    saveReadIds(newRead)
  }

  if (!mounted) {
    return (
      <button className="relative p-2 text-gray-500 hover:text-gray-300 transition-colors" disabled>
        <BellIcon />
      </button>
    )
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-200 hover:bg-[#222632] rounded-lg transition-all duration-200"
        aria-label="Notifikasi"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-[#1a1d27] border border-[#2a2e3a] rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e3a]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500/20 text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto max-h-[350px]">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm text-gray-500">Tidak ada notifikasi</p>
                <p className="text-xs text-gray-600 mt-1">Semua stok dalam kondisi aman</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map(n => {
                  const isRead = readIds.has(n.id)
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-150 ${
                        isRead
                          ? 'bg-transparent hover:bg-[#222632]/50'
                          : 'bg-[#222632] hover:bg-[#282c3a]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          n.severity === 'danger' ? 'bg-red-500' : 'bg-amber-500'
                        } ${isRead ? 'opacity-0' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${
                              isRead ? 'text-gray-400' : 'text-gray-200'
                            }`}>
                              {n.productName}
                            </p>
                            <span className={
                              n.severity === 'danger' ? 'badge-danger' : 'badge-warning'
                            }>
                              {n.severity === 'danger' ? 'Stok Habis' : 'Stok Rendah'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {n.sku} • Stok: <span className={
                              n.severity === 'danger' ? 'text-red-400 font-medium' : 'text-amber-400 font-medium'
                            }>{n.currentStock}</span> / min: {n.minStock}
                          </p>
                        </div>
                        {n.severity === 'danger' ? (
                          <span className="text-red-400 text-lg flex-shrink-0">🔴</span>
                        ) : (
                          <span className="text-amber-400 text-lg flex-shrink-0">🟡</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#2a2e3a] p-3">
            <Link
              href="/products"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm text-indigo-400 hover:text-indigo-300 py-1.5 rounded-lg hover:bg-indigo-600/10 transition-all"
            >
              Lihat semua produk →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Bell Icon ───────────────────────────────────────
function BellIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}
