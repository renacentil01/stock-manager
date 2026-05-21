'use client'

import { usePathname } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'
import PWAInstall from '@/components/PWAInstall'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Produk',
  '/scanner': 'Scanner',
  '/transactions': 'Transaksi',
  '/analytics': 'AI Analytics',
  '/barcode': 'Barcode Generator',
  '/categories': 'Kategori',
}

export default function Header() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'Dashboard'

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-[#13161f] border-b border-[#2a2e3a] z-40 flex items-center justify-between px-8">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="flex items-center gap-3">
        <PWAInstall />
        <NotificationBell />
      </div>
    </header>
  )
}
