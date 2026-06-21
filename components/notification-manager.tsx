'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, BellOff, X, Clock } from 'lucide-react'
import { format, isToday, isPast, parseISO } from 'date-fns'
import type { Note } from '@/lib/types'

interface DueItem {
  id: string
  title: string
  type: string
  dueDate: string
}

export function NotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | 'prompt'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [showBanner, setShowBanner] = useState(false)
  const [dueItems, setDueItems] = useState<DueItem[]>([])
  const [showReminder, setShowReminder] = useState(true)
  const notifiedRef = useRef<Set<string>>(new Set())

  const checkDueItems = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const res = await fetch(`/api/notes?startDate=${today}&endDate=${today}`)
      const data = await res.json()
      const items: DueItem[] = (data.notes || [])
        .filter((n: Note) => {
          if (!n.dueDate) return false
          const due = n.dueDate.slice(0, 10)
          const isDue = due === today
          const isOverdue = isPast(parseISO(due + 'T00:00:00')) && !n.done
          return (isDue || isOverdue) && !n.done
        })
        .map((n: Note) => ({
          id: n.id,
          title: n.title || n.content.slice(0, 40),
          type: n.type,
          dueDate: n.dueDate || '',
        }))
      setDueItems(items)

      if (permission === 'granted') {
        for (const item of items) {
          if (notifiedRef.current.has(item.id)) continue
          notifiedRef.current.add(item.id)
          const label = item.type === 'task' ? '任务' : item.type === 'event' ? '事件' : '条目'
          new Notification('LifeOS 提醒', {
            body: `${label}「${item.title}」今天截止`,
            icon: '/icons/icon-192.png',
            tag: item.id,
          })
        }
      }
    } catch {
      // silently fail
    }
  }, [permission])

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    setPermission(Notification.permission)
    if (Notification.permission === 'granted') {
      checkDueItems()
      const interval = setInterval(checkDueItems, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
    if (Notification.permission === 'default') {
      setTimeout(() => setShowBanner(true), 2000)
    }
  }, [checkDueItems])

  const requestPermission = async () => {
    const result = await Notification.requestPermission()
    setPermission(result)
    setShowBanner(false)
    if (result === 'granted') {
      checkDueItems()
    }
  }

  if (typeof Notification === 'undefined') return null

  return (
    <>
      {showBanner && permission === 'default' && (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up rounded-lg border bg-card p-3 shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-72">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">开启通知提醒</span>
            </div>
            <button onClick={() => setShowBanner(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">接收任务截止和事件提醒</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={requestPermission}
              className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              允许通知
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              稍后
            </button>
          </div>
        </div>
      )}

      {dueItems.length > 0 && showReminder && permission !== 'granted' && (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up rounded-lg border bg-amber-50 p-3 shadow-lg dark:bg-amber-950 md:bottom-4 md:left-auto md:right-4 md:w-72">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {dueItems.length} 条待处理
              </span>
            </div>
            <button onClick={() => setShowReminder(false)}>
              <X className="h-4 w-4 text-amber-600" />
            </button>
          </div>
          <div className="mt-1.5 space-y-1">
            {dueItems.slice(0, 3).map(item => (
              <p key={item.id} className="truncate text-xs text-amber-700 dark:text-amber-300">
                {item.type === 'task' ? '📋' : '📅'} {item.title}
              </p>
            ))}
            {dueItems.length > 3 && (
              <p className="text-xs text-amber-600">还有 {dueItems.length - 3} 条...</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
