'use client'

import { useEffect, useState, useRef, memo } from 'react'
import { Download, Loader2, Check } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const PwaHandler = memo(function PwaHandler() {
  const [isOffline, setIsOffline] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'done' | 'error'>('idle')

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const handleInstallRef = useRef<() => void>(() => {})

  handleInstallRef.current = () => {
    const ev = deferredPromptRef.current
    if (!ev) return
    ev.prompt()
    setInstallState('installing')
    ev.userChoice.then(({ outcome }) => {
      if (outcome === 'accepted') {
        setInstalled(true)
        setShowInstall(false)
        setInstallState('done')
      } else {
        setInstallState('idle')
      }
      deferredPromptRef.current = null
    }).catch(() => {
      setInstallState('error')
      deferredPromptRef.current = null
    })
  }

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPromptRef.current = e as BeforeInstallPromptEvent
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowInstall(false)
      setInstallState('done')
    })

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const isInstallReady = installState === 'idle'

  return (
    <>
      {isOffline && (
        <div className="fixed left-0 right-0 top-0 z-50 bg-yellow-500 px-4 py-1 text-center text-xs font-medium text-white">
          当前离线，部分功能可能不可用
        </div>
      )}
      {showInstall && !installed && (
        <div className="fixed bottom-24 left-4 right-4 z-50 rounded-lg border bg-card p-3 shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-72">
          <p className="mb-2 text-sm font-medium">安装 LifeOS 到桌面</p>
          <p className="mb-3 text-xs text-muted-foreground">快速访问，像原生应用一样使用</p>
          <div className="flex gap-2">
            <button
              className={cn(buttonVariants({ size: "sm" }), "flex-1", !isInstallReady && "pointer-events-none opacity-50")}
              disabled={!isInstallReady}
              onClick={() => handleInstallRef.current?.()}
            >
              {installState === 'installing' ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : installState === 'done' ? (
                <Check className="mr-1 h-4 w-4" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              {installState === 'installing' ? '安装中...' : installState === 'done' ? '已安装' : '安装'}
            </button>
            <Button size="sm" variant="outline" onClick={() => setShowInstall(false)}>
              稍后
            </Button>
          </div>
          {installState === 'error' && (
            <p className="mt-2 text-xs text-destructive">安装失败，请重试</p>
          )}
        </div>
      )}
    </>
  )
})

export { PwaHandler }
