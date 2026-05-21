import type { Metadata, Viewport } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ClientInit from '@/components/ClientInit'

export const metadata: Metadata = {
  title: 'StockFlow — Inventory Manager',
  description: 'Simple & beautiful inventory management system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'StockFlow',
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="font-sans">
        <ClientInit />
        <Sidebar />
        <Header />
        <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)] p-8">
          {children}
        </main>
      </body>
    </html>
  )
}
