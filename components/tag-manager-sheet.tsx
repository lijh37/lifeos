'use client'

import { useEffect, useState } from 'react'
import { Tags, Check, X, Pencil, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { UNTAGGED } from '@/lib/types'
import { useAppStore } from '@/store'

interface TagManagerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTagSelect?: (tag: string) => void
  onTagsChanged?: () => void
}

export function TagManagerSheet({ open, onOpenChange, onTagSelect, onTagsChanged }: TagManagerSheetProps) {
  const [tags, setTags] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const fetchTags = () => {
    setLoading(true)
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => setTags(data.tags))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open) fetchTags()
  }, [open])

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 2500)
  }

  const handleRename = async (oldName: string) => {
    const newName = editValue.trim()
    if (!newName || newName === oldName) {
      setEditing(null)
      return
    }
    const res = await fetch('/api/tags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName }),
    })
    if (res.ok) {
      showMsg('success', `已重命名为「${newName}」`)
      setTags(prev => prev.map(t => t.name === oldName ? { ...t, name: newName } : t))
      // 同步更新缓存笔记中的标签名
      const store = useAppStore.getState()
      store.notes.forEach(n => {
        if (n.tags.includes(oldName)) {
          store.updateNote(n.id, { tags: n.tags.map(t => t === oldName ? newName : t) })
        }
      })
      onTagsChanged?.()
    } else {
      showMsg('error', '重命名失败')
    }
    setEditing(null)
  }

  const handleDelete = async (name: string) => {
    const res = await fetch(`/api/tags?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (res.ok) {
      showMsg('success', `标签「${name}」已删除`)
      setTags(prev => prev.filter(t => t.name !== name))
      // 同步从缓存笔记中移除该标签
      const store = useAppStore.getState()
      store.notes.forEach(n => {
        if (n.tags.includes(name)) {
          store.updateNote(n.id, { tags: n.tags.filter(t => t !== name) })
        }
      })
      onTagsChanged?.()
    } else {
      showMsg('error', '删除失败')
    }
    setDeleteTarget(null)
  }

  const handleTagClick = (tagName: string) => {
    onTagSelect?.(tagName)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            标签管理
          </SheetTitle>
        </SheetHeader>

        {message && (
          <div className={`px-4 py-2 text-center text-xs font-medium ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <ScrollArea className="min-h-0 flex-1">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              加载中…
            </div>
          ) : tags.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              还没有标签，创建笔记即可添加标签
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {tags.map(tag => (
                <Card key={tag.name} className="card-hover">
                  <CardContent className="flex items-center gap-3 p-3">
                    {editing === tag.name ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(tag.name)
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleRename(tag.name)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleTagClick(tag.name)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            #
                          </span>
                          <span className="truncate text-sm font-medium">
                            {tag.name === UNTAGGED ? '未分类' : tag.name}
                          </span>
                        </button>
                        <span className="shrink-0 text-xs text-muted-foreground">{tag.count} 条</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => { setEditing(tag.name); setEditValue(tag.name) }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <button
                          onClick={() => setDeleteTarget(tag.name)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <AlertDialogRoot
          open={deleteTarget !== null}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定删除标签「{deleteTarget}」？</AlertDialogTitle>
              <AlertDialogDescription>将从所有笔记中移除该标签。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogRoot>
      </SheetContent>
    </Sheet>
  )
}
