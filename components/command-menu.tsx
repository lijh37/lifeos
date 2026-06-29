'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/theme-provider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { typeLabels, typeColors } from '@/lib/constants'
import type { Note, Habit } from '@/lib/types'
import {
  Bot,
  Notebook,
  CheckSquare,
  PiggyBank,
  Trophy,
  CalendarDays,
  Search as SearchIcon,
  Settings,
  Tags,
  BarChart3,
  Sun,
  Moon,
  Monitor,
  X,
  Command,
  type LucideIcon,
} from 'lucide-react'

// ─── Navigation items (mirrors sidebar.tsx) ───
const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/', label: 'AI 对话', icon: Bot },
  { href: '/notes', label: '笔记', icon: Notebook },
  { href: '/tasks', label: '任务', icon: CheckSquare },
  { href: '/expenses', label: '预算', icon: PiggyBank },
  { href: '/habits', label: '习惯', icon: Trophy },
  { href: '/search', label: '搜索', icon: SearchIcon },
  { href: '/tags', label: '标签', icon: Tags },
  { href: '/calendar', label: '日历', icon: CalendarDays },
  { href: '/stats', label: '统计', icon: BarChart3 },
  { href: '/settings', label: '设置', icon: Settings },
]

// ─── Quick actions ───
interface QuickAction {
  id: string
  label: string
  icon: LucideIcon
  kind: 'navigate' | 'theme'
  href?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-note', label: '新建笔记', icon: Notebook, kind: 'navigate', href: '/' },
  { id: 'new-task', label: '新建任务', icon: CheckSquare, kind: 'navigate', href: '/tasks' },
  { id: 'new-habit', label: '新建习惯', icon: Trophy, kind: 'navigate', href: '/habits' },
  { id: 'toggle-theme', label: '切换主题', icon: Sun, kind: 'theme' },
]

const NEXT_THEME: Record<string, 'light' | 'dark' | 'system'> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const THEME_ICONS: Record<string, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

// ─── Shared item shape for the flat item list ───
interface CmdItem {
  id: string
  label: string
  icon?: LucideIcon
  badgeType?: string
  onSelect: () => void
}

// ─── Section descriptor (header + range into the flat list) ───
interface Section {
  title: string
  startIndex: number
  count: number
}

export default function CommandMenu() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ notes: Note[]; habits: Habit[] }>({
    notes: [],
    habits: [],
  })
  const [searching, setSearching] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isMacRef = useRef(false)

  // ── Detect platform once ──
  useEffect(() => {
    isMacRef.current =
      typeof navigator !== 'undefined' &&
      navigator.platform.toLowerCase().includes('mac')
  }, [])

  // ── Global keyboard shortcut ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ── Reset state whenever palette opens ──
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({ notes: [], habits: [] })
      setHighlightedIndex(0)
      // Defer focus so the DOM is ready
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // ── Debounced search ──
  useEffect(() => {
    if (!open) return

    const trimmed = query.trim()
    if (!trimmed) {
      setResults({ notes: [], habits: [] })
      setSearching(false)
      return
    }

    setSearching(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`
        )
        if (!res.ok) throw new Error('Search request failed')
        const data: { notes: Note[]; habits: Habit[] } = await res.json()
        // Guard against stale responses — only update if query hasn't changed
        setResults(data)
      } catch {
        setResults({ notes: [], habits: [] })
      } finally {
        setSearching(false)
      }
    }, 200)

    return () => {
      clearTimeout(debounceRef.current)
    }
  }, [query, open])

  // ── Build items + sections from current state ──
  const { items, sections } = useMemo<{
    items: CmdItem[]
    sections: Section[]
  }>(() => {
    // ── Search mode ──
    if (query.trim()) {
      const list: CmdItem[] = []
      const secs: Section[] = []

      if (results.notes.length > 0) {
        secs.push({
          title: '笔记',
          startIndex: list.length,
          count: results.notes.length,
        })
        for (const note of results.notes) {
          list.push({
            id: `note-${note.id}`,
            label: note.title || note.content.slice(0, 60),
            badgeType: note.type,
            onSelect: () => {
              router.push('/notes')
              setOpen(false)
            },
          })
        }
      }

      if (results.habits.length > 0) {
        secs.push({
          title: '习惯',
          startIndex: list.length,
          count: results.habits.length,
        })
        for (const habit of results.habits) {
          list.push({
            id: `habit-${habit.id}`,
            label: habit.name,
            badgeType: 'habit',
            onSelect: () => {
              router.push('/habits')
              setOpen(false)
            },
          })
        }
      }

      return { items: list, sections: secs }
    }

    // ── Default mode: navigation + quick actions ──
    const list: CmdItem[] = []
    const secs: Section[] = []

    // Navigation section
    secs.push({ title: '页面导航', startIndex: 0, count: NAV_ITEMS.length })
    for (const nav of NAV_ITEMS) {
      list.push({
        id: `nav-${nav.href}`,
        label: nav.label,
        icon: nav.icon,
        onSelect: () => {
          router.push(nav.href)
          setOpen(false)
        },
      })
    }

    // Quick actions section
    secs.push({
      title: '快捷操作',
      startIndex: list.length,
      count: QUICK_ACTIONS.length,
    })
    for (const action of QUICK_ACTIONS) {
      const Icon =
        action.id === 'toggle-theme'
          ? THEME_ICONS[theme] || Sun
          : action.icon
      list.push({
        id: action.id,
        label: action.label,
        icon: Icon,
        onSelect: () => {
          if (action.kind === 'navigate' && action.href) {
            router.push(action.href)
          } else {
            setTheme(NEXT_THEME[theme])
          }
          setOpen(false)
        },
      })
    }

    return { items: list, sections: secs }
  }, [query, results, theme, router, setTheme])

  // ── Reset highlight when item list changes ──
  useEffect(() => {
    setHighlightedIndex(0)
  }, [items.length])

  // ── Scroll highlighted item into view ──
  useEffect(() => {
    if (!listContainerRef.current) return
    const el = listContainerRef.current.querySelector<HTMLElement>(
      `[data-cmd-index="${highlightedIndex}"]`
    )
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  // ── Keyboard navigation handler (on the panel) ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (items.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => (prev + 1) % items.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(
            prev => (prev - 1 + items.length) % items.length
          )
          break
        case 'Home':
          e.preventDefault()
          setHighlightedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setHighlightedIndex(items.length - 1)
          break
        case 'Enter':
          e.preventDefault()
          items[highlightedIndex]?.onSelect()
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          break
      }
    },
    [items, highlightedIndex]
  )

  // ── Render nothing when closed ──
  if (!open) return null

  const hasQuery = query.trim().length > 0
  const hasResults = items.length > 0

  return (
    <>
      {/* ── Overlay — desktop only ── */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 animate-fade-in max-sm:hidden"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* ── Panel ── */}
      <div
        className={cn(
          'fixed z-[101] flex flex-col bg-card',
          // Desktop: centred card
          'sm:left-1/2 sm:top-[12vh] sm:-translate-x-1/2 sm:w-full sm:max-w-lg sm:rounded-xl sm:border sm:shadow-2xl animate-slide-up',
          // Mobile: full-screen
          'inset-0 max-sm:pt-14'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        onKeyDown={handleKeyDown}
      >
        {/* ── Search input ── */}
        <div className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3.5">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索笔记、习惯，或输入命令…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="搜索"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="清除搜索"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden h-5 items-center gap-0.5 rounded-md border bg-muted/50 px-1.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <Command className="h-3 w-3" />
            K
          </kbd>
        </div>

        {/* ── Scrollable results ── */}
        <ScrollArea className="max-sm:flex-1 sm:max-h-[60vh]">
          <div ref={listContainerRef}>
            {/* Loading spinner */}
            {searching && (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              </div>
            )}

            {/* Empty state */}
            {!searching && hasQuery && !hasResults && (
              <div className="flex flex-col items-center gap-1 py-16 text-center">
                <SearchIcon className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">未找到结果</p>
                <p className="text-xs text-muted-foreground/50">
                  尝试其他关键词
                </p>
              </div>
            )}

            {/* Sections + items */}
            {!searching &&
              sections.map(section => (
                <div key={section.title} className="px-1 pb-1 pt-2">
                  <p className="px-3 py-1.5 text-xs font-medium tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                  {Array.from({ length: section.count }, (_, offset) => {
                    const idx = section.startIndex + offset
                    const item = items[idx]
                    if (!item) return null
                    const active = highlightedIndex === idx

                    return (
                      <button
                        key={item.id}
                        data-cmd-index={idx}
                        onClick={item.onSelect}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-left transition-colors',
                          active
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground hover:bg-accent/50 hover:text-accent-foreground'
                        )}
                      >
                        {/* Badge for search-result types */}
                        {item.badgeType ? (
                          <Badge
                            className={cn(
                              'shrink-0 pointer-events-none',
                              typeColors[item.badgeType] ||
                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            )}
                          >
                            {typeLabels[item.badgeType] || item.badgeType}
                          </Badge>
                        ) : item.icon ? (
                          <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : null}
                        <span className="truncate">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
          </div>
        </ScrollArea>

        {/* ── Mobile footer hint ── */}
        <div className="flex shrink-0 items-center justify-between border-t px-4 py-2.5 text-[11px] text-muted-foreground/60 max-sm:pb-[max(0.625rem,env(safe-area-inset-bottom,0.625rem))] sm:hidden">
          <span>↑↓ 导航 &nbsp;·&nbsp; ↵ 选择</span>
          <button
            onClick={() => setOpen(false)}
            className="hover:text-foreground transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </>
  )
}
