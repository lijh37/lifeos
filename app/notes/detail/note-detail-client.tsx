'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react'


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
