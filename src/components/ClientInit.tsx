'use client'

import { useEffect } from 'react'
import { seedDemoData } from '@/lib/store'

export default function ClientInit() {
  useEffect(() => {
    seedDemoData()

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
