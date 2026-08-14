'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const MarkdownEditor = dynamic(() => import('@/components/markdown-editor').then(mod => ({ default: mod.MarkdownEditor })), {
  loading: () => (
    <div className="flex min-h-0 flex-1 flex-col min-w-0">
      <div className="h-10 w-full skeleton-pulse rounded-none" />
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-3/4 rounded skeleton-pulse" />
          <div className="h-4 w-full rounded skeleton-pulse" />
          <div className="h-4 w-5/6 rounded skeleton-pulse" />
          <div className="h-4 w-2/3 rounded skeleton-pulse" />
        </div>
        <div className="hidden w-1/2 space-y-3 sm:block">
          <div className="h-4 w-3/4 rounded skeleton-pulse" />
          <div className="h-4 w-full rounded skeleton-pulse" />
        </div>
      </div>
    </div>
  ),
})

import {
  AlertDialogRoot,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { Note } from '@/lib/types'
import { useAppStore } from '@/store'
import { updateNote, deleteNote } from '@/lib/services/notes'

export function NoteDetailClient({ initialNote }: { initialNote: Note }) {
  const router = useRouter()
  const [note, setNote] = useState<Note>(initialNote)
  const [title, setTitle] = useState(initialNote.title || '')
  const [tagInput, setTagInput] = useState('')

  const [saving, setSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Sync state when navigating between notes (adjust state during render)
  const prevInitialKey = `${initialNote.id}:${initialNote.title ?? ''}`
  const [prevKey, setPrevKey] = useState(prevInitialKey)
  if (prevInitialKey !== prevKey) {
    setPrevKey(prevInitialKey)
    setNote(initialNote)
    setTitle(initialNote.title || '')
  }

  // Ensure note is in the list cache so back navigation shows it without a refresh
  useEffect(() => {
    const store = useAppStore.getState()
    const exists = store.notes.some(n => n.id === initialNote.id)
    if (!exists) {
      store.addNote(initialNote)
    }
  }, [initialNote.id])

  function handleGoBack() {
    // Fallback to /notes when there's no history
    if (window.history.length > 1) {
      router.back()
    } else {
      router.replace('/notes')
    }
  }

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle)
    setSaving(true)
    clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      const trimmed = newTitle.trim()
      updateNote(note.id, { title: trimmed || null }).then(() => {
        useAppStore.getState().updateNote(note.id, { title: trimmed || '' })
        setSaving(false)
      }).catch(() => {
        setSaving(false)
        toast.error('保存标题失败')
      })
    }, 500)
  }

  async function handleSaveContent(content: string) {
    try {
      await updateNote(note.id, { content })
      useAppStore.getState().updateNote(note.id, { content })
    } catch {
      toast.error('保存内容失败')
    }
  }

  async function handleAddTag(tag: string) {
    if (note.tags.includes(tag)) return
    const newTags = [...note.tags, tag]
    setNote(prev => ({ ...prev, tags: newTags }))
    setTagInput('')
    useAppStore.getState().updateNote(note.id, { tags: newTags })
    try {
      await updateNote(note.id, { tags: newTags })
    } catch {
      toast.error('添加标签失败')
      // Rollback optimistic update
      setNote(prev => ({ ...prev, tags: note.tags }))
      useAppStore.getState().updateNote(note.id, { tags: note.tags })
    }
  }

  async function handleRemoveTag(tag: string) {
    const newTags = note.tags.filter(t => t !== tag)
    setNote(prev => ({ ...prev, tags: newTags }))
    useAppStore.getState().updateNote(note.id, { tags: newTags })
    try {
      await updateNote(note.id, { tags: newTags })
    } catch {
      toast.error('移除标签失败')
      setNote(prev => ({ ...prev, tags: note.tags }))
      useAppStore.getState().updateNote(note.id, { tags: note.tags })
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteNote(note.id)
      useAppStore.getState().removeNote(note.id)
      toast.success('笔记已删除')
      router.replace('/notes')
    } catch {
      toast.error('删除失败，请重试')
      setDeleting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <button
          onClick={handleGoBack}
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
        <div className="flex items-center gap-2 shrink-0">
          {saving && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
              <Loader2 className="h-3 w-3 animate-spin" />
              保存中
            </span>
          )}
          <AlertDialogRoot open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确定删除这条笔记？</AlertDialogTitle>
                <AlertDialogDescription>
                  删除后无法恢复，请谨慎操作。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <><Loader2 className="mr-1 h-3 w-3 animate-spin" />删除中</>
                  ) : (
                    '删除'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogRoot>
        </div>
      </header>

      {/* Tags row - above editor (below header) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2 shrink-0">
        {note.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1 text-xs">
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
          // enterKeyHint="enter"：Android 键盘否则会推断为「下一项」
          // （textarea 是下一个可聚焦元素），回车变成焦点穿越直接跳进编辑区，
          // 且该动作在部分键盘上发 keyCode 229/Unidentified，onKeyDown 拦不住。
          // 显式声明后键盘显示「回车」并发送标准 Enter 事件
          enterKeyHint="enter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            // 中文输入法组合中回车是确认候选词，交给 IME 处理（否则打断组合、
            // 候选词丢失）；组合结束后再按一次回车才提交标签
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
            e.preventDefault()
            const tag = tagInput.trim()
            if (tag) handleAddTag(tag)
          }}
          placeholder={note.tags.length === 0 ? '添加标签...' : ''}
          className="h-8 min-w-[80px] flex-1 bg-transparent text-base focus:outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/20 focus:rounded-sm sm:text-sm"
        />
      </div>

      {/* Editor area - fills remaining space */}
      <div className="flex min-h-0 flex-1">
        <MarkdownEditor
          key={note.id}
          content={note.content}
          onSave={handleSaveContent}
          placeholder="开始写笔记..."
        />
      </div>
    </div>
  )
}
