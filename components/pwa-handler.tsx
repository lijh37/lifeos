'use client'

import { useEffect, useState, memo } from 'react'

const PwaHandler = memo(function PwaHandler() {
  const [isOffline, setIsOffline] = useState(false)

  // Register Service Worker for offline caching
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed — app still works, just no offline cache
      })
    }
  }, [])

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-yellow-500 px-4 py-1 text-center text-xs font-medium text-white">
      当前离线，部分功能可能不可用
    </div>
  )
})

export { PwaHandler }
