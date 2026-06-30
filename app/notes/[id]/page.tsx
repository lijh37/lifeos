'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarkdownEditor } from '@/components/markdown-editor'
import { SkeletonCard } from '@/components/skeleton-card'
import type { Note } from '@/lib/types'

export default function NoteDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(true)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    fetch(`/api/notes/${id}`)
      .then(res => res.json())
      .then(data => {
        setNote(data.note)
        setTitle(data.note.title || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle)
    clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() || null }),
      })
    }, 500)
  }

  async function handleSaveContent(content: string) {
    await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
  }

  async function handleAddTag(tag: string) {
    setNote((prev) => {
      if (!prev || prev.tags.includes(tag)) return prev
      const newTags = [...prev.tags, tag]
      fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      }).catch(() => {})
      return { ...prev, tags: newTags }
    })
    setTagInput('')
  }

  async function handleRemoveTag(tag: string) {
    setNote((prev) => {
      if (!prev) return prev
      const newTags = prev.tags.filter(t => t !== tag)
      fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      }).catch(() => {})
      return { ...prev, tags: newTags }
    })
  }

  async function handleDelete() {
    if (!confirm('确定删除这条笔记？')) return
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    router.push('/notes')
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="w-full max-w-lg px-4">
          <SkeletonCard count={1} />
        </div>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>笔记未找到</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/notes')}>
          返回笔记列表
        </Button>
      </div>
    )
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
          className="flex-1 bg-transparent text-lg font-semibold focus:outline-none placeholder:text-muted-foreground/50"
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
          <Badge key={tag} variant="secondary" className="gap-1 text-[11px]">
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-destructive transition-colors"
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
          className="h-7 min-w-[80px] flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  )
}
