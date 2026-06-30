'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Notebook,
  CheckSquare,
  Calendar,
  Trash2,
  Search,
  Pencil,
  Plus,
  CheckSquare as CheckboxIcon,
  Square,
  Tags,
  Archive,
  GripVertical,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ExportButton } from '@/components/export-button'
import { SkeletonNoteList } from '@/components/skeleton-card'
import { stripMarkdown } from '@/lib/markdown'
import type { Note, NoteType } from '@/lib/types'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { typeLabels as typeLabelsFromConstants } from '@/lib/constants'

interface NoteListProps {
  defaultFilter?: NoteType | 'all'
}

export function NoteList({ defaultFilter = 'note' }: NoteListProps) {
  const router = useRouter()
  const { notes, setNotes, loading, setLoading, removeNote, updateNote, cursor, hasMore, setCursor, setHasMore, appendNotes } = useAppStore()
  const [filterType, setFilterType] = useState<NoteType | 'all'>(defaultFilter)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Note[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  async function fetchNotes(loadMore = false) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (loadMore && cursor) {
        params.set('cursor', cursor)
      }
      const res = await fetch(`/api/notes?${params}`)
      const data = await res.json()
      if (loadMore) {
        appendNotes(data.notes)
      } else {
        setNotes(data.notes)
        setCursor(data.nextCursor || null)
      }
      setHasMore(!!data.nextCursor)
    } catch (e) {
      console.error('Failed to fetch notes:', e)
    } finally {
      setLoading(false)
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loading || !hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchNotes(true)
    }
  }, [loading, hasMore, cursor])

  useEffect(() => {
    fetchNotes()
  }, [])

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      removeNote(id)
    } catch (e) {
      console.error('Failed to delete note:', e)
    }
  }

  async function handleCreateNote() {
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
    }
  }

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults(null)
      return
    }
    const res = await fetch(`/api/notes?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setSearchResults(data.notes)
  }

  const baseNotes = searchResults ?? notes
  const displayNotes = baseNotes
    .filter((n) => (filterType === 'all' || n.type === filterType))
    .filter((n) => showArchived ? n.tags.includes('archived') : !n.tags.includes('archived'))

  const typeIcons: Record<string, typeof Notebook> = {
    note: Notebook,
    task: CheckSquare,
    event: Calendar,
  }

  const typeLabels: Record<string, string> = { ...typeLabelsFromConstants, all: '全部' }

  const filters: (NoteType | 'all')[] = ['all', 'note', 'task', 'event']

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

  async function handleBatchDelete() {
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
    } catch (e) {
      console.error('Batch delete failed:', e)
    }
  }

  async function handleBatchArchive() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    try {
      await fetch('/api/notes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', ids }),
      })
      ids.forEach(id => {
        const note = notes.find(n => n.id === id)
        if (note) {
          const tags = [...note.tags]
          if (!tags.includes('archived')) tags.push('archived')
          updateNote(id, { tags, done: true })
        }
      })
      clearSelection()
    } catch (e) {
      console.error('Batch archive failed:', e)
    }
  }

  async function handleBatchTag() {
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
    } catch (e) {
      console.error('Batch tag failed:', e)
    }
  }

  function handleDragStart(id: string) {
    setDragId(id)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    setDragOverId(id)
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setDragOverId(null)
      return
    }

    const currentNotes = searchResults ?? notes
    const fromIdx = currentNotes.findIndex(n => n.id === dragId)
    const toIdx = currentNotes.findIndex(n => n.id === targetId)
    if (fromIdx === -1 || toIdx === -1) {
      setDragId(null)
      setDragOverId(null)
      return
    }

    const reordered = [...currentNotes]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setNotes(reordered)

    // Persist new order (only in full-list mode, not search results)
    if (!searchResults) {
      try {
        await fetch('/api/notes/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: reordered.map(n => n.id) }),
        })
      } catch (e) {
        console.error('Failed to persist order:', e)
      }
    }

    setDragId(null)
    setDragOverId(null)
  }

  function handleDragEnd() {
    setDragId(null)
    setDragOverId(null)
  }

  const isSelectedAll = displayNotes.length > 0 && selectedIds.size === displayNotes.length
  const showBatchBar = selectedIds.size > 0

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索笔记…"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 text-base sm:text-sm"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {filters.map((f) => (
              <Button
                key={f}
                variant={filterType === f ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterType(f)}
                className="text-xs"
              >
                {typeLabels[f]}
              </Button>
            ))}
            <Button
              variant={showArchived ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="text-xs"
            >
              <Archive className="mr-1 h-3 w-3" />
              归档
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="default" size="sm" onClick={handleCreateNote} className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              新建
            </Button>
            <ExportButton type="notes" />
          </div>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4" onScroll={handleScroll}>
        {loading ? (
          <SkeletonNoteList count={5} />
        ) : displayNotes.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            {searchQuery ? '没有找到匹配的记录' : showArchived ? '没有归档记录' : '还没有任何记录，点击上方 + 新建笔记'}
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs gap-1">
                {isSelectedAll ? <CheckboxIcon className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {isSelectedAll ? '取消全选' : '全选'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size > 0 ? `已选 ${selectedIds.size} 项` : `${displayNotes.length} 项`}
              </span>
            </div>
            {displayNotes.length > 200 ? (
              <VirtualNoteList
                notes={displayNotes}
                onEdit={(note) => router.push(`/notes/${note.id}`)}
                onDelete={handleDelete}
                typeIcons={typeIcons}
                typeLabels={typeLabels}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                dragId={dragId}
                dragOverId={dragOverId}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ) : (
              <div className="space-y-2 animate-stagger">
                {displayNotes.map((note) => <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={(note) => router.push(`/notes/${note.id}`)}
                  onDelete={handleDelete}
                  typeIcons={typeIcons}
                  typeLabels={typeLabels}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  dragId={dragId}
                  dragOverId={dragOverId}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />)}
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {showBatchBar && (
        <div className="sticky bottom-0 border-t bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">已选 {selectedIds.size} 项</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBatchTag} className="gap-1">
                <Tags className="h-3.5 w-3.5" />
                改标签
              </Button>
              <Button variant="outline" size="sm" onClick={handleBatchArchive} className="gap-1">
                <Archive className="h-3.5 w-3.5" />
                归档
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBatchDelete} className="gap-1">
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>取消</Button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

function NoteCard({
  note, onEdit, onDelete, typeIcons, typeLabels, selectedIds, onToggleSelect,
  dragId, dragOverId, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  typeIcons: Record<string, typeof Notebook>
  typeLabels: Record<string, string>
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  dragId?: string | null
  dragOverId?: string | null
  onDragStart?: (id: string) => void
  onDragOver?: (e: React.DragEvent, id: string) => void
  onDrop?: (e: React.DragEvent, id: string) => void
  onDragEnd?: () => void
}) {
  const Icon = typeIcons[note.type]
  const isSelected = selectedIds?.has(note.id) ?? false
  const isDragging = dragId === note.id
  const isDragOver = dragOverId === note.id

  return (
    <Card
      className={cn(
        'card-hover',
        note.done && 'opacity-60',
        isDragging && 'opacity-30',
        isDragOver && 'ring-2 ring-primary',
        isSelected && 'ring-2 ring-primary/50',
      )}
      draggable
      onDragStart={() => onDragStart?.(note.id)}
      onDragOver={(e) => onDragOver?.(e, note.id)}
      onDrop={(e) => onDrop?.(e, note.id)}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {onToggleSelect && (
              <button
                onClick={() => onToggleSelect(note.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {isSelected ? (
                  <CheckboxIcon className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            )}
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40" />
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium" onClick={() => onEdit(note)}>
              {note.title || stripMarkdown(note.content, 60) || '无标题'}
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {typeLabels[note.type]}
            </Badge>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
      <CardContent className="p-3 pt-2" onClick={() => onEdit(note)}>
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
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <span>
            {format(new Date(note.createdAt), 'MM/dd HH:mm', { locale: zhCN })}
          </span>
          {note.dueDate && (
            <span className="text-amber-600">
              截止: {format(new Date(note.dueDate), 'MM/dd HH:mm', { locale: zhCN })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function VirtualNoteList({
  notes, onEdit, onDelete, typeIcons, typeLabels,
  selectedIds, onToggleSelect, dragId, dragOverId, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  notes: Note[]
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  typeIcons: Record<string, typeof Notebook>
  typeLabels: Record<string, string>
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  dragId?: string | null
  dragOverId?: string | null
  onDragStart?: (id: string) => void
  onDragOver?: (e: React.DragEvent, id: string) => void
  onDrop?: (e: React.DragEvent, id: string) => void
  onDragEnd?: () => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 160,
    overscan: 10,
  })

  return (
    <div ref={parentRef} className="h-full overflow-auto">
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
                typeIcons={typeIcons}
                typeLabels={typeLabels}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                dragId={dragId}
                dragOverId={dragOverId}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
