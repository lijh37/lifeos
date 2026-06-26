'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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
  Check,
  Undo2,
  Search,
  Pencil,
  CheckSquare as CheckboxIcon,
  Square,
  Tags,
  Archive,
  GripVertical,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ExportButton } from '@/components/export-button'
import { SkeletonNoteList } from '@/components/skeleton-card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import DOMPurify from 'dompurify'
import { RichEditor } from '@/components/rich-editor'
import type { Note, NoteType } from '@/lib/types'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

const XSS_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'sub', 'sup',
    'input',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'class', 'style', 'src', 'alt',
    'width', 'height', 'type', 'checked', 'disabled',
    'data-type', 'id',
  ],
  ALLOW_DATA_ATTR: true,
}

interface NoteListProps {
  defaultFilter?: NoteType | 'all'
}

export function NoteList({ defaultFilter = 'all' }: NoteListProps) {
  const { notes, setNotes, loading, setLoading, removeNote, updateNote } = useAppStore()
  const [filterType, setFilterType] = useState<NoteType | 'all'>(defaultFilter)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Note[] | null>(null)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  async function fetchNotes() {
    setLoading(true)
    try {
      const res = await fetch('/api/notes')
      const data = await res.json()
      setNotes(data.notes)
    } catch (e) {
      console.error('Failed to fetch notes:', e)
    } finally {
      setLoading(false)
    }
  }

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

  async function handleToggleDone(id: string, done: boolean) {
    await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !done }),
    })
    updateNote(id, { done: !done })
  }

  async function handleSaveContent(id: string, content: string) {
    await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    updateNote(id, { content })
    setEditingNote(null)
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

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '')

  const baseNotes = searchResults ?? notes
  const displayNotes = baseNotes
    .filter((n) => (filterType === 'all' || n.type === filterType))
    .filter((n) => showArchived ? n.tags.includes('archived') : !n.tags.includes('archived'))

  const typeIcons: Record<string, typeof Notebook> = {
    note: Notebook,
    task: CheckSquare,
    event: Calendar,
  }

  const typeLabels: Record<string, string> = {
    note: '笔记',
    task: '任务',
    event: '事件',
    all: '全部',
  }

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

  function handleDrop(e: React.DragEvent, targetId: string) {
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
            className="pl-9"
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
          <ExportButton type="notes" />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <SkeletonNoteList count={5} />
        ) : displayNotes.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            {searchQuery ? '没有找到匹配的记录' : showArchived ? '没有归档记录' : '还没有任何记录，去 AI 对话页面创建吧'}
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
                onEdit={setEditingNote}
                onDelete={handleDelete}
                onToggleDone={handleToggleDone}
                typeIcons={typeIcons}
                typeLabels={typeLabels}
                stripHtml={stripHtml}
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
                  onEdit={setEditingNote}
                  onDelete={handleDelete}
                  onToggleDone={handleToggleDone}
                  typeIcons={typeIcons}
                  typeLabels={typeLabels}
                  stripHtml={stripHtml}
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

      <Sheet open={!!editingNote} onOpenChange={(open) => { if (!open) setEditingNote(null) }}>
        <SheetContent side="bottom" className="max-h-[85vh] sm:max-w-lg sm:mx-auto sm:rounded-t-xl">
          <SheetHeader>
            <SheetTitle>
              {editingNote?.title || (editingNote ? stripHtml(editingNote.content).slice(0, 40) : '编辑')}
            </SheetTitle>
          </SheetHeader>
          {editingNote && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1">
              <RichEditor
                key={editingNote.id}
                content={editingNote.content}
                onSave={async (html) => handleSaveContent(editingNote.id, html)}
                placeholder="开始编辑..."
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function NoteCard({
  note, onEdit, onDelete, onToggleDone, typeIcons, typeLabels, stripHtml,
  selectedIds, onToggleSelect, dragId, dragOverId, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onToggleDone: (id: string, done: boolean) => void
  typeIcons: Record<string, typeof Notebook>
  typeLabels: Record<string, string>
  stripHtml: (html: string) => string
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
  const isHtml = note.content.includes('<')
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
              {note.title || stripHtml(note.content).slice(0, 40) || '无标题'}
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
            {note.type === 'task' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onToggleDone(note.id, note.done)}
              >
                {note.done ? (
                  <Undo2 className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
            )}
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
        {isHtml ? (
          <div
            className="line-clamp-3 text-sm text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content, XSS_CONFIG) }}
          />
        ) : (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {note.content}
          </p>
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
  notes, onEdit, onDelete, onToggleDone, typeIcons, typeLabels, stripHtml,
  selectedIds, onToggleSelect, dragId, dragOverId, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  notes: Note[]
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onToggleDone: (id: string, done: boolean) => void
  typeIcons: Record<string, typeof Notebook>
  typeLabels: Record<string, string>
  stripHtml: (html: string) => string
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
                onToggleDone={onToggleDone}
                typeIcons={typeIcons}
                typeLabels={typeLabels}
                stripHtml={stripHtml}
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
