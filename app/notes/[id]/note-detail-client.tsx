'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MarkdownEditor } from '@/components/markdown-editor'
import type { Note } from '@/lib/types'

export function NoteDetailClient({ initialNote }: { initialNote: Note }) {
  const router = useRouter()
  const [note, setNote] = useState<Note>(initialNote)
  const [title, setTitle] = useState(initialNote.title || '')
  const [tagInput, setTagInput] = useState('')
  const titleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Sync state when navigating between notes
  useEffect(() => {
    setNote(initialNote)
    setTitle(initialNote.title || '')
  }, [initialNote.id, initialNote.title])

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle)
    clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() || null }),
      })
    }, 500)
  }

  async function handleSaveContent(content: string) {
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
  }

  async function handleAddTag(tag: string) {
    if (note.tags.includes(tag)) return
    const newTags = [...note.tags, tag]
    setNote(prev => ({ ...prev, tags: newTags }))
    setTagInput('')
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      })
    } catch { /* optimistic update, ignore */ }
  }

  async function handleRemoveTag(tag: string) {
    const newTags = note.tags.filter(t => t !== tag)
    setNote(prev => ({ ...prev, tags: newTags }))
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      })
    } catch { /* optimistic update, ignore */ }
  }

  async function handleDelete() {
    if (!confirm('确定删除这条笔记？')) return
    await fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
    router.replace('/notes')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="笔记标题"
          className="flex-1 bg-transparent text-lg font-semibold focus:outline-none focus:text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/20 focus:rounded-sm"
        />
        <button
          onClick={handleDelete}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="删除"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      {/* Editor area - fills remaining space */}
      <div className="flex min-h-0 flex-1">
        <MarkdownEditor
          key={note.id}
          content={note.content}
          onSave={handleSaveContent}
          placeholder="开始写笔记..."
        />
      </div>

      {/* Tags bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-t px-4 py-2 shrink-0">
        {note.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1 text-[11px]">
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground/50 hover:bg-destructive/20 hover:text-destructive transition-colors"
              aria-label={`移除标签 ${tag}`}
            >
              ×
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tagInput.trim()) {
              e.preventDefault()
              handleAddTag(tagInput.trim())
            }
          }}
          placeholder={note.tags.length === 0 ? '添加标签...' : ''}
          className="h-7 min-w-[80px] flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/20 focus:rounded-sm"
        />
      </div>
    </div>
  )
}
