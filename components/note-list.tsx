'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ExportButton } from '@/components/export-button'
import { SkeletonCard } from '@/components/skeleton-card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import DOMPurify from 'dompurify'
import { RichEditor } from '@/components/rich-editor'
import type { Note, NoteType } from '@/lib/types'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

interface NoteListProps {
  defaultFilter?: NoteType | 'all'
}

export function NoteList({ defaultFilter = 'all' }: NoteListProps) {
  const { notes, setNotes, loading, setLoading, removeNote, updateNote } = useAppStore()
  const [filterType, setFilterType] = useState<NoteType | 'all'>(defaultFilter)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Note[] | null>(null)
  const [editingNote, setEditingNote] = useState<Note | null>(null)

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

  const displayNotes = searchResults ?? notes.filter(
    (n) => filterType === 'all' || n.type === filterType
  )

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
          </div>
          <ExportButton type="notes" />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <SkeletonCard count={5} />
        ) : displayNotes.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            {searchQuery ? '没有找到匹配的记录' : '还没有任何记录，去 AI 对话页面创建吧'}
          </div>
        ) : (
          <div className="space-y-2 animate-stagger">
            {displayNotes.map((note) => {
              const Icon = typeIcons[note.type]
              const isHtml = note.content.includes('<')

              return (
                <Card
                  key={note.id}
                  className={cn('card-hover cursor-pointer', note.done && 'opacity-60')}
                  onClick={() => setEditingNote(note)}
                >
                  <CardHeader className="p-3 pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">
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
                          onClick={() => setEditingNote(note)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {note.type === 'task' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleToggleDone(note.id, note.done)}
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
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-2">
                    {isHtml ? (
                      <div
                        className="line-clamp-3 text-sm text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content) }}
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
            })}
          </div>
        )}
      </ScrollArea>

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
