'use client'

import { useState, useCallback } from 'react'
import { Tags, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
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

function BatchActionsBar({
  selectedIds,
  onDelete,
  onTag,
  onClearSelection,
}: {
  selectedIds: Set<string>
  onDelete: () => void
  onTag: (tag: string) => void
  onClearSelection: () => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [tagName, setTagName] = useState('')

  const handleTagConfirm = useCallback(() => {
    if (tagName.trim()) {
      onTag(tagName.trim())
      setTagName('')
      setTagOpen(false)
    }
  }, [tagName, onTag])

  return (
    <>
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] max-md:bottom-[calc(56px+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">已选 {selectedIds.size} 项</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTagOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Tags className="h-4 w-4" />
              改标签
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </button>
            <button
              onClick={onClearSelection}
              className="flex h-8 items-center rounded-md px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialogRoot open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除选中的 {selectedIds.size} 条笔记？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复，请谨慎操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>

      {/* Tag input dialog */}
      <AlertDialogRoot
        open={tagOpen}
        onOpenChange={(open) => {
          setTagOpen(open)
          if (!open) setTagName('')
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>添加标签</AlertDialogTitle>
            <AlertDialogDescription>
              输入标签名称，将为选中的 {selectedIds.size} 条笔记添加该标签。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6">
            <Input
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="输入标签名称…"
              className="w-full"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTagConfirm()
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleTagConfirm}>
              添加
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </>
  )
}

export { BatchActionsBar }
