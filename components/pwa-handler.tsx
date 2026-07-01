'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Download, Bug, RefreshCw, Loader2, Check } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaHandler() {
  const [isOffline, setIsOffline] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [swStatus, setSwStatus] = useState<'pending' | 'active' | 'error'>('pending')
  const [showDebug, setShowDebug] = useState(false)
  const [manifestStatus, setManifestStatus] = useState<string>('checking')
  const [pageUrl, setPageUrl] = useState('')
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

  const checkSW = useCallback(() => {
    if (!('serviceWorker' in navigator)) {
      setSwStatus('error')
      return
    }
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      setSwStatus(reg.active ? 'active' : 'pending')
      reg.addEventListener('updatefound', () => {
        setSwStatus(reg.installing ? 'pending' : 'active')
      })
    }).catch((err) => {
      console.warn('SW registration failed:', err)
      setSwStatus('error')
    })
  }, [])

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

    if (window.location.search.includes('debug=1')) setShowDebug(true)
    checkSW()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [checkSW])

  useEffect(() => {
    setPageUrl(`${location.protocol}//${location.host}`)
    fetch('/manifest.json').then((r) => {
      if (r.ok) setManifestStatus(`✅ ${r.status} ${r.headers.get('content-type') || ''}`)
      else setManifestStatus(`❌ ${r.status}`)
    }).catch(() => setManifestStatus('❌ fetch failed'))
  }, [])

  const isInstallReady = installState === 'idle'

  const debugInfo = [
    `URL: ${pageUrl || '加载中...'}`,
    `SW: ${swStatus === 'active' ? '✅ 已注册' : swStatus === 'error' ? '❌ 失败' : '⏳ 注册中'}`,
    `beforeinstallprompt: ${deferredPromptRef.current ? '✅ 已触发' : '⏳ 等待交互后触发'}`,
    `manifest: ${manifestStatus}`,
    `离线: ${isOffline ? '⚠️ 是' : '✅ 否'}`,
    `已安装: ${installed ? '✅ 是' : '否'}`,
  ]

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

      {showDebug && (
        <div className="fixed right-4 top-16 z-50 w-72 rounded-lg border bg-card p-3 text-xs shadow-lg">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="font-medium">PWA 诊断 <button onClick={() => setShowDebug(false)} className="ml-1 text-muted-foreground hover:text-foreground">✕</button></p>
            <button
              onClick={() => setShowDebug(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
              title="关闭诊断"
            >
              <Bug className="h-3.5 w-3.5" />
            </button>
          </div>
          {debugInfo.map((line, i) => (
            <p key={i} className="font-mono leading-5">{line}</p>
          ))}
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={checkSW}>
              <RefreshCw className="mr-1 h-3 w-3" />
              刷新
            </Button>
            <p className="text-muted-foreground">
              {swStatus !== 'active' ? 'SW 未注册成功' : ''}
              {!deferredPromptRef.current && swStatus === 'active' ? '在页面上点几下即可触发安装' : ''}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
