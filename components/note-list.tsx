'use client'

import { useEffect, useState, useRef, useCallback, useLayoutEffect, memo } from 'react'
import { useRouter } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckSquare,
  Trash2,
  Search,
  Pencil,
  Plus,
  Square,
  Tags,
  Pin,
  PinOff,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ExportButton } from '@/components/export-button'
import { SkeletonNoteList } from '@/components/skeleton-card'
import { stripMarkdown } from '@/lib/markdown'
import type { Note } from '@/lib/types'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const SCROLL_POSITION_KEY = 'note_list_scroll'

export function NoteList() {
  const router = useRouter()
  const { notes, setNotes, initialLoading, loadingMore, setInitialLoading, setLoadingMore, removeNote, updateNote, cursor, hasMore, setCursor, setHasMore, appendNotes } = useAppStore()
  const [mounted, setMounted] = useState(false)
  // Wait for ScrollArea to mount so VirtualNoteList gets a valid scrollRef
  useLayoutEffect(() => { setMounted(true) }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Note[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const searchController = useRef<AbortController | undefined>(undefined)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([])
  const activeTagRef = useRef<string | null>(null)
  activeTagRef.current = activeTag

  const fetchNotes = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true)
    } else {
      setInitialLoading(true)
    }
    try {
      const params = new URLSearchParams()
      params.set('limit', '20')
      params.set('summary', 'true')
      if (activeTag) params.set('tag', activeTag)
      if (loadMore && cursor) {
        params.set('cursor', cursor)
      }
      const res = await fetch(`/api/notes?${params}`)
      const data = await res.json()
      if (loadMore) {
        appendNotes(data.notes)
      } else {
        setNotes(data.notes)
      }
      setCursor(data.nextCursor || null)
      setHasMore(!!data.nextCursor)
    } catch (e) {
      console.error('Failed to fetch notes:', e)
    } finally {
      if (loadMore) {
        setLoadingMore(false)
      } else {
        setInitialLoading(false)
      }
    }
  }, [activeTag, cursor, setInitialLoading, setLoadingMore, setNotes, appendNotes, setCursor, setHasMore])

  const scrollRef = useRef<HTMLDivElement>(null)
  // Refs keep the scroll listener stable across load cycles while reading the
  // latest state, avoiding disconnect/reconnect cascade.
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(false)
  loadingMoreRef.current = loadingMore
  hasMoreRef.current = hasMore

  // Native DOM scroll + wheel listeners on the Viewport, because Base UI's
  // React onScroll prop may not fire reliably with its custom scrollbar.
  // Uses refs for loadingMore/hasMore to avoid stale closures.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !hasMore || initialLoading || searchQuery) return

    const checkAndLoad = () => {
      if (loadingMoreRef.current || !hasMoreRef.current || initialLoading || searchQuery) return
      const { scrollHeight, scrollTop, clientHeight } = el
      if (scrollHeight - scrollTop - clientHeight < 400) {
        fetchNotes(true)
      }
    }

    el.addEventListener('scroll', checkAndLoad, { passive: true })
    el.addEventListener('wheel', checkAndLoad, { passive: true })
    return () => {
      el.removeEventListener('scroll', checkAndLoad)
      el.removeEventListener('wheel', checkAndLoad)
    }
    // loadingMore intentionally omitted — ref is used instead to keep the
    // listener stable across load cycles (no disconnect/reconnect cascade).
  }, [hasMore, initialLoading, fetchNotes, searchQuery])

  // One-shot auto-fill: after initial load, if content doesn't fill the viewport,
  // load one more page automatically. Prevents an empty-looking page while
  // avoiding cascading (runs exactly once per note-list mount).
  const didFillCheck = useRef(false)
  useEffect(() => {
    if (initialLoading || loadingMore || !hasMore || searchQuery || didFillCheck.current) return
    const el = scrollRef.current
    if (el && el.scrollHeight - el.clientHeight < 400) {
      didFillCheck.current = true
      fetchNotes(true)
    }
  }, [initialLoading, loadingMore, hasMore, searchQuery, fetchNotes])

  useEffect(() => {
    // If we have cached notes from a previous session, show them immediately
    // instead of re-fetching — preserves pagination and enables scroll restoration.
    // Also triggered when tag filter changes (see handleTagSelect which clears notes).
    if (notes.length === 0) {
      fetchNotes()
    }
  }, [activeTag])

  // Save scroll position before navigating away
  useEffect(() => {
    return () => {
      if (scrollRef.current) {
        try {
          sessionStorage.setItem(SCROLL_POSITION_KEY, String(scrollRef.current.scrollTop))
        } catch { /* quota exceeded, ignore */ }
      }
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      removeNote(id)
      toast.success('笔记已删除')
    } catch (e) {
      console.error('Failed to delete note:', e)
      toast.error('删除失败，请重试')
    }
  }, [removeNote])

  const handleCreateNote = useCallback(async () => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', title: '', content: '', tags: [] }),
      })
      const data = await res.json()
      router.push(`/notes/${data.note.id}`)
    } catch (e) {
      console.error('Failed to create note:', e)
      toast.error('创建笔记失败，请重试')
    }
  }, [router])

  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q)
    clearTimeout(searchTimer.current)

    if (!q.trim()) {
      setSearchResults(null)
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    searchTimer.current = setTimeout(async () => {
      // Cancel previous in-flight request to avoid race condition
      searchController.current?.abort()
      const controller = new AbortController()
      searchController.current = controller

      try {
        const searchParams = new URLSearchParams()
        searchParams.set('q', q)
        searchParams.set('summary', 'true')
        if (activeTag) searchParams.set('tag', activeTag)
        const res = await fetch(`/api/notes?${searchParams}`, {
          signal: controller.signal,
        })
        if (!controller.signal.aborted) {
          const data = await res.json()
          setSearchResults(data && Array.isArray(data.notes) ? data.notes : [])
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        console.error('Search failed:', e)
        if (!controller.signal.aborted) {
          setSearchResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false)
        }
      }
    }, 300)
  }, [activeTag])

  const handleTagSelect = useCallback((tag: string | null) => {
    if (tag === activeTag) return
    // Cancel pending search when switching tag
    clearTimeout(searchTimer.current)
    searchController.current?.abort()
    setActiveTag(tag)
    setSearchQuery('')
    setSearchResults(null)
    setNotes([])
    setCursor(null)
    setHasMore(true)
  }, [activeTag, setNotes, setCursor, setHasMore])

  const displayNotes = searchResults ?? notes

  // Restore scroll position after data is ready (from cache or fresh fetch)
  const scrollRestored = useRef(false)
  useEffect(() => {
    if (!initialLoading && !loadingMore && displayNotes.length > 0 && !scrollRestored.current) {
      const savedScroll = sessionStorage.getItem(SCROLL_POSITION_KEY)
      if (savedScroll !== null) {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = parseInt(savedScroll, 10)
          }
        })
        sessionStorage.removeItem(SCROLL_POSITION_KEY)
      }
      scrollRestored.current = true
    }
  }, [initialLoading, loadingMore, displayNotes.length])

  // Fetch available tags for the filter bar
  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => setAvailableTags(data.tags || []))
      .catch(() => {})
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === displayNotes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayNotes.map(n => n.id)))
    }
  }, [displayNotes, selectedIds])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条笔记？`)) return
    const ids = Array.from(selectedIds)
    try {
      await fetch('/api/notes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids }),
      })
      ids.forEach(id => removeNote(id))
      clearSelection()
      toast.success(`已删除 ${ids.length} 条笔记`)
    } catch (e) {
      console.error('Batch delete failed:', e)
      toast.error('批量删除失败，请重试')
    }
  }, [selectedIds, removeNote, clearSelection])

  const handleBatchTag = useCallback(async () => {
    const tag = prompt('输入要添加的标签名称：')
    if (!tag || selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    try {
      await fetch('/api/notes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tag', ids, tag }),
      })
      ids.forEach(id => {
        const note = notes.find(n => n.id === id)
        if (note && !note.tags.includes(tag)) {
          updateNote(id, { tags: [...note.tags, tag] })
        }
      })
      clearSelection()
      toast.success(`已添加标签「${tag}」`)
    } catch (e) {
      console.error('Batch tag failed:', e)
      toast.error('批量打标签失败，请重试')
    }
  }, [notes, updateNote, clearSelection, selectedIds])

  const handleTogglePin = useCallback(async (note: Note) => {
    const newPinned = !note.pinned
    // Build updated array with the new pinned value, then sort by pinned DESC, created_at DESC
    const sorted = notes
      .map(n => n.id === note.id ? { ...n, pinned: newPinned } : n)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    setNotes(sorted)
    // Don't reset cursor/hasMore — that would trigger the IntersectionObserver
    // to re-fetch page 1 via loadMore, creating duplicate entries.
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
      })
      toast.success(newPinned ? '已置顶' : '已取消置顶')
    } catch (e) {
      console.error('Failed to toggle pin:', e)
      toast.error('操作失败，请重试')
      const rolledBack = notes
        .map(n => n.id === note.id ? { ...n, pinned: !newPinned } : n)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
      setNotes(rolledBack)
    }
  }, [notes, setNotes])



  const isSelectedAll = displayNotes.length > 0 && selectedIds.size === displayNotes.length
  const showBatchBar = selectedIds.size > 0

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="relative">
          {searchLoading && searchQuery.trim() ? (
            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            placeholder="搜索笔记…"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-9 text-base sm:text-sm"
            aria-label="搜索笔记"
          />
        </div>
        <div className="mt-2 flex items-center justify-end">
          <div className="flex items-center gap-1">
            <Button variant="default" size="sm" onClick={handleCreateNote} className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              新建
            </Button>
            <ExportButton />
          </div>
        </div>
      </div>

      {/* Tag filter bar — always visible, chips appear as tags load */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b px-4 py-2 scrollbar-hide">
        <Badge
          variant={!activeTag ? 'default' : 'outline'}
          className="cursor-pointer shrink-0 text-xs"
          onClick={() => handleTagSelect(null)}
        >
          全部
        </Badge>
        {availableTags.map(t => (
          <Badge
            key={t.name}
            variant={activeTag === t.name ? 'default' : 'secondary'}
            className="cursor-pointer shrink-0 text-xs gap-1"
            onClick={() => handleTagSelect(t.name)}
          >
            {t.name}
            <span className="text-[10px] opacity-70">({t.count})</span>
          </Badge>
        ))}
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4 pb-20">
        {initialLoading && notes.length === 0 ? (
          <SkeletonNoteList count={5} />
        ) : displayNotes.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            {searchLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />搜索中…</>
            ) : searchQuery ? (
              '没有找到匹配的记录'
            ) : activeTag ? (
              <>没有标记「<span className="font-medium">{activeTag}</span>」的笔记</>
            ) : (
              '还没有任何记录，点击上方 + 新建笔记'
            )}
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs gap-1">
                {isSelectedAll ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {isSelectedAll ? '取消全选' : '全选'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size > 0 ? `已选 ${selectedIds.size} 项` : `${displayNotes.length} 项`}
              </span>
            </div>
            {displayNotes.length > 50 && mounted ? (
              <VirtualNoteList
                notes={displayNotes}
                onEdit={(note) => router.push(`/notes/${note.id}`)}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onSelectTag={handleTagSelect}
                scrollRef={scrollRef}
              />
            ) : (
              <div className="space-y-2 animate-stagger">
                {displayNotes.map((note) => <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={(note) => router.push(`/notes/${note.id}`)}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onSelectTag={handleTagSelect}
                />)}
              </div>
            )}
            {hasMore && !searchQuery && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNotes(true)}
                  disabled={loadingMore}
                  className="gap-1"
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {loadingMore ? '加载中…' : '加载更多'}
                </Button>
              </div>
            )}
            {/* Bottom spacer for mobile nav clearance */}
            <div className="h-20" />
          </>
        )}
      </ScrollArea>

      {showBatchBar && (
        <BatchActionsBar
          selectedIds={selectedIds}
          onDelete={handleBatchDelete}
          onTag={handleBatchTag}
          onClearSelection={clearSelection}
        />
      )}

    </div>
  )
}

// ─── Date formatting helper ──────────────────────────────────────────────────

function formatNoteDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffHours < 48) return '昨天'
  if (diffHours < 168) return `${Math.floor(diffHours / 24)}天前`
  return format(date, 'yyyy/MM/dd HH:mm', { locale: zhCN })
}

// ─── NoteCard ────────────────────────────────────────────────────────────────

const NoteCard = memo(function NoteCard({
  note, onEdit, onDelete, onTogglePin, selectedIds, onToggleSelect, onSelectTag,
}: {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onTogglePin: (note: Note) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectTag?: (tag: string) => void
}) {
  const isSelected = selectedIds?.has(note.id) ?? false

  return (
    <Card
      className={cn(
        'card-hover',
        note.done && 'opacity-50',
        isSelected && 'ring-2 ring-primary/50',
      )}
    >
      <CardHeader className="p-4 pb-1">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
            {onToggleSelect && (
              <button
                onClick={() => onToggleSelect(note.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              onClick={() => onTogglePin(note)}
              className="shrink-0 text-muted-foreground/30 hover:text-foreground transition-colors"
              title={note.pinned ? '取消置顶' : '置顶'}
            >
              {note.pinned ? (
                <Pin className="h-4 w-4 fill-foreground text-foreground" />
              ) : (
                <PinOff className="h-4 w-4" />
              )}
            </button>
            <CardTitle className="truncate text-sm font-medium" onClick={() => onEdit(note)}>
              {note.title || '无标题'}
            </CardTitle>
          </div>
          <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onEdit(note)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => onDelete(note.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1" onClick={() => onEdit(note)}>
        {note.content ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {stripMarkdown(note.content, 200)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">空白笔记</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer text-[10px] hover:bg-primary/20 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onSelectTag?.(tag) }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <span>
            {formatNoteDate(note.createdAt)}
          </span>
          {note.dueDate && (
            <span className="text-amber-600">
              截止: {formatNoteDate(note.dueDate)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

NoteCard.displayName = 'NoteCard'

// ─── VirtualNoteList ─────────────────────────────────────────────────────────

const VirtualNoteList = memo(function VirtualNoteList({
  notes, onEdit, onDelete, onTogglePin,
  selectedIds, onToggleSelect, onSelectTag,
  scrollRef,
}: {
  notes: Note[]
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onTogglePin: (note: Note) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectTag?: (tag: string) => void
  scrollRef: { current: HTMLDivElement | null }
}) {
  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 160,
    overscan: 10,
  })

  return (
    <div
      className="relative w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const note = notes[virtualItem.index]
        return (
          <div
            key={note.id}
            className="absolute left-0 right-0 px-0.5"
            style={{
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <NoteCard
              note={note}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onSelectTag={onSelectTag}
            />
          </div>
        )
      })}
    </div>
  )
})

VirtualNoteList.displayName = 'VirtualNoteList'

// ─── BatchActionsBar ─────────────────────────────────────────────────────────

function BatchActionsBar({
  selectedIds,
  onDelete,
  onTag,
  onClearSelection,
}: {
  selectedIds: Set<string>
  onDelete: () => void
  onTag: () => void
  onClearSelection: () => void
}) {
  return (
    <div className="sticky bottom-0 border-t bg-background p-3 max-md:bottom-[calc(56px+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">已选 {selectedIds.size} 项</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onTag} className="gap-1">
            <Tags className="h-3.5 w-3.5" />
            改标签
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1">
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>取消</Button>
        </div>
      </div>
    </div>
  )
}
