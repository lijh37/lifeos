'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Notebook, Trophy, X } from 'lucide-react'

const STORAGE_KEY = 'fab-position'

const DEFAULT_MOBILE = { x: 16, y: 96 }
const DEFAULT_DESKTOP = { x: 24, y: 24 }

interface Pos { x: number; y: number }

const menuItems = [
  { href: '/', label: '新建笔记', icon: Notebook, query: '' },
  { href: '/habits', label: '新建习惯', icon: Trophy, query: '' },
]

export function FabButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos>(DEFAULT_MOBILE)
  const dragging = useRef(false)
  const dragStart = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const curPos = useRef<Pos>(DEFAULT_MOBILE)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let saved: Pos | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) saved = JSON.parse(raw)
    } catch {}
    if (!saved) {
      saved = window.innerWidth < 768 ? DEFAULT_MOBILE : DEFAULT_DESKTOP
    }
    const isMobile = window.innerWidth < 768
    const minY = isMobile ? 76 : 12
    const maxY = window.innerHeight - 64
    saved.y = Math.min(Math.max(minY, saved.y), maxY)
    setPos(saved)
    curPos.current = saved
  }, [])

  const onDown = (e: React.PointerEvent) => {
    const el = btnRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    dragStart.current = { sx: e.clientX, sy: e.clientY, ox: curPos.current.x, oy: curPos.current.y }
    dragging.current = false
  }

  const onMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.sx
    const dy = e.clientY - dragStart.current.sy
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragging.current = true
    const isMobile = window.innerWidth < 768
    const minY = isMobile ? 76 : 12
    const maxY = window.innerHeight - 64
    const next: Pos = {
      x: Math.max(0, dragStart.current.ox - dx),
      y: Math.min(Math.max(minY, dragStart.current.oy - dy), maxY),
    }
    curPos.current = next
    setPos(next)
  }

  const onUp = () => {
    if (!dragStart.current) return
    if (!dragging.current) setOpen(prev => !prev)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(curPos.current))
    dragStart.current = null
  }

  return (
    <div className="fixed z-50" style={{ bottom: pos.y, right: pos.x }}>
      {open && (
        <div className="absolute bottom-16 right-0 mb-1 flex flex-col gap-1 rounded-lg border bg-popover p-1.5 shadow-lg">
          {menuItems.map(item => (
            <button
              key={item.label}
              onClick={() => { router.push(item.href + item.query); setOpen(false) }}
              className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
      <button
        ref={btnRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
        style={{ touchAction: 'none' }}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  )
}
