'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckSquare,
  Search,
  Plus,
  Square,
  Loader2,
  Download,
  Settings2,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Input } from '@/components/ui/input'
import { SkeletonNoteList } from '@/components/skeleton-card'
import type { Note } from '@/lib/types'
import { UNTAGGED } from '@/lib/types'
import { useAppStore } from '@/store'
import { toast } from 'sonner'
import { NoteCard } from '@/components/note-card'

const TagManagerSheet = dynamic(() => import('@/components/tag-manager-sheet').then(mod => ({ default: mod.TagManagerSheet })), {
  loading: () => null,
})

const BatchActionsBar = dynamic(() => import('@/components/batch-actions-bar').then(mod => ({ default: mod.BatchActionsBar })), {
  loading: () => null,
})

const SCROLL_POSITION_KEY = 'note_list_scroll'

export function NoteList() {
  const router = useRouter()
  // Select each slice individually so the component only re-renders when the
  // specific piece it uses changes (e.g. editing a note's title no longer
  // re-renders the whole list parent). Action refs are stable across renders.
  const notes = useAppStore((s) => s.notes)
  const setNotes = useAppStore((s) => s.setNotes)
  const initialLoading = useAppStore((s) => s.initialLoading)
  const setInitialLoading = useAppStore((s) => s.setInitialLoading)
  const removeNote = useAppStore((s) => s.removeNote)
  const updateNote = useAppStore((s) => s.updateNote)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Note[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const searchController = useRef<AbortController | undefined>(undefined)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([])
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const activeTagRef = useRef<string | null>(null)
  activeTagRef.current = activeTag

  const fetchNotes = useCallback(async () => {
    setInitialLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '500')
      params.set('summary', 'true')
      const res = await fetch(`/api/notes?${params}`)
      const data = await res.json()
      setNotes(data.notes)
    } catch (e) {
      console.error('Failed to fetch notes:', e)
    } finally {
      setInitialLoading(false)
    }
  }, [setInitialLoading, setNotes])

  // Re-fetch notes from the server after a tag mutation (rename/delete) so the
  // list reflects the change authoritatively instead of relying solely on the
  // optimistic Zustand patch, which can desync from the server.
  const refreshNotes = useCallback(() => {
    const params = new URLSearchParams()
    params.set('limit', '500')
    params.set('summary', 'true')
    params.set('_t', Date.now().toString())
    fetch(`/api/notes?${params}`, { cache: 'no-store' })
      .then(res => { if (!res.ok) throw new Error(res.statusText); return res.json() })
      .then(data => { if (Array.isArray(data.notes)) setNotes(data.notes) })
      .catch(e => console.error('refreshNotes failed:', e))
  }, [setNotes])

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
      try {
        sessionStorage.setItem(SCROLL_POSITION_KEY, String(window.scrollY))
      } catch { /* quota exceeded, ignore */ }
    }
  }, [])

  // Fetch available tags for the filter bar (defined early because used by handleDelete)
  const refreshAvailableTags = useCallback(() => {
    fetch(`/api/tags?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => { if (!res.ok) throw new Error(res.statusText); return res.json() })
      .then(data => setAvailableTags(data.tags || []))
      .catch(e => console.error('refreshAvailableTags failed:', e))
  }, [])

  // After a tag rename/delete, refresh both the tag filter bar and the note
  // list from the server so they stay consistent.
  const handleTagsChanged = useCallback(() => {
    refreshAvailableTags()
    refreshNotes()
  }, [refreshAvailableTags, refreshNotes])

  useEffect(() => {
    refreshAvailableTags()
  }, [refreshAvailableTags])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      removeNote(id)
      refreshAvailableTags()
      toast.success('笔记已删除')
    } catch (e) {
      console.error('Failed to delete note:', e)
      toast.error('删除失败，请重试')
    }
  }, [removeNote, refreshAvailableTags])

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

  const handleOpenTagManager = useCallback(() => {
    setTagManagerOpen(true)
  }, [])

  const handleEdit = useCallback((note: Note) => {
    router.push(`/notes/${note.id}`)
  }, [router])

  const handleTagSelect = useCallback((tag: string | null) => {
    if (tag === activeTag) return
    // Cancel pending search when switching tag
    clearTimeout(searchTimer.current)
    searchController.current?.abort()
    setActiveTag(tag)
    setSearchQuery('')
    setSearchResults(null)
  }, [activeTag])

  const displayNotes = useMemo(() => (
    searchResults ?? (
      activeTag
        ? notes.filter(n => activeTag === UNTAGGED ? n.tags.length === 0 : n.tags.includes(activeTag))
        : notes
    )
  ), [searchResults, notes, activeTag])

  // Restore scroll position after data is ready (from cache or fresh fetch)
  const scrollRestored = useRef(false)
  useEffect(() => {
    if (!initialLoading && displayNotes.length > 0 && !scrollRestored.current) {
      const savedScroll = sessionStorage.getItem(SCROLL_POSITION_KEY)
      if (savedScroll !== null) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(savedScroll, 10))
        })
        sessionStorage.removeItem(SCROLL_POSITION_KEY)
      }
      scrollRestored.current = true
    }
  }, [initialLoading, displayNotes.length])

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
    const ids = Array.from(selectedIds)
    try {
      await fetch('/api/notes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids }),
      })
      ids.forEach(id => removeNote(id))
      clearSelection()
      refreshAvailableTags()
      toast.success(`已删除 ${ids.length} 条笔记`)
    } catch (e) {
      console.error('Batch delete failed:', e)
      toast.error('批量删除失败，请重试')
    }
  }, [selectedIds, removeNote, clearSelection, refreshAvailableTags])

  const handleBatchTag = useCallback(async (tag: string) => {
    if (!tag.trim() || selectedIds.size === 0) return
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
      refreshAvailableTags()
      toast.success(`已添加标签「${tag}」`)
    } catch (e) {
      console.error('Batch tag failed:', e)
      toast.error('批量打标签失败，请重试')
    }
  }, [notes, updateNote, clearSelection, selectedIds, refreshAvailableTags])

  const handleTogglePin = useCallback(async (note: Note) => {
    const newPinned = !note.pinned
    // Optimistic update: move note to correct section O(n) — no full sort
    const updatedNote = { ...note, pinned: newPinned }
    const withOutNote = notes.filter(n => n.id !== note.id)
    if (newPinned) {
      // Insert after last pinned item (pinned section is at front)
      const insertAt = withOutNote.findLastIndex(n => n.pinned) + 1
      withOutNote.splice(insertAt, 0, updatedNote)
    } else {
      // Append to end (unpinned section)
      withOutNote.push(updatedNote)
    }
    setNotes(withOutNote)
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
      // Rollback: restore original position
      setNotes(notes.map(n => n.id === note.id ? { ...n, pinned: !newPinned } : n))
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/api/export', '_blank')}
              className="gap-1 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              导出
            </Button>
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
            {t.name === UNTAGGED ? '未分类' : t.name}
            <span className="text-[10px] opacity-70">({t.count})</span>
          </Badge>
        ))}
        <button
          onClick={handleOpenTagManager}
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="管理标签"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 p-4 pb-20">
        {initialLoading && notes.length === 0 ? (
          <SkeletonNoteList count={5} />
        ) : displayNotes.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            {searchLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />搜索中…</>
            ) : searchQuery ? (
              '没有找到匹配的记录'
            ) : activeTag ? (
              <>{activeTag === UNTAGGED ? '没有未分类的笔记' : <>没有标记「<span className="font-medium">{activeTag}</span>」的笔记</>}</>
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
            <div className="space-y-1.5">
              {displayNotes.map((note) => <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onSelectTag={handleTagSelect}
              />)}
            </div>

          </>
        )}
      </div>

      {showBatchBar && (
        <BatchActionsBar
          selectedIds={selectedIds}
          onDelete={handleBatchDelete}
          onTag={handleBatchTag}
          onClearSelection={clearSelection}
        />
      )}

      <TagManagerSheet
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        onTagSelect={handleTagSelect}
        onTagsChanged={handleTagsChanged}
      />
    </div>
  )
}
