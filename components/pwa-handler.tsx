'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PwaHandler() {
  const [isOffline, setIsOffline] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
      })
    }

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    ;(deferredPrompt as any).prompt()
    const result = await (deferredPrompt as any).userChoice
    if (result.outcome === 'accepted') {
      setShowInstall(false)
    }
    setDeferredPrompt(null)
  }

  return (
    <>
      {isOffline && (
        <div className="fixed left-0 right-0 top-0 z-50 bg-yellow-500 px-4 py-1 text-center text-xs font-medium text-white">
          当前离线，部分功能可能不可用
        </div>
      )}
      {showInstall && (
        <div className="fixed bottom-20 left-4 right-4 z-50 rounded-lg border bg-card p-3 shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-72">
          <p className="mb-2 text-sm font-medium">安装 LifeOS 到桌面</p>
          <p className="mb-3 text-xs text-muted-foreground">快速访问，像原生应用一样使用</p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleInstall}>
              <Download className="mr-1 h-4 w-4" />
              安装
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowInstall(false)}>
              稍后
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
