import { Product } from './types'

export function getExpiryStatus(expiryDate: string | null): 'expired' | 'expiring_soon' | 'safe' | 'none' {
  if (!expiryDate) return 'none'
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
  if (diffDays < 0) return 'expired'
  if (diffDays <= 30) return 'expiring_soon'
  return 'safe'
}

export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
}

export function getExpiryLabel(expiryDate: string | null): string {
  if (!expiryDate) return 'Tidak ada'
  const days = getDaysUntilExpiry(expiryDate)
  if (days === null) return 'Tidak ada'
  if (days < 0) return `${Math.abs(days)} hari lalu`
  if (days === 0) return 'Hari ini'
  return `${days} hari lagi`
}

export function sortByExpiry(products: Product[]): Product[] {
  const statusOrder: Record<string, number> = { expired: 0, expiring_soon: 1, safe: 2, none: 3 }
  return [...products].sort((a, b) => {
    const statusA = statusOrder[getExpiryStatus(a.expiryDate)]
    const statusB = statusOrder[getExpiryStatus(b.expiryDate)]
    if (statusA !== statusB) return statusA - statusB
    const daysA = getDaysUntilExpiry(a.expiryDate) ?? Infinity
    const daysB = getDaysUntilExpiry(b.expiryDate) ?? Infinity
    return daysA - daysB
  })
}
