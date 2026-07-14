'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, Square, Pin, PinOff } from 'lucide-react'
import { stripMarkdown } from '@/lib/strip-markdown'
import type { Note } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatNoteDate } from '@/components/format-note-date'

const NoteCard = memo(function NoteCard({
  note, onEdit, onDelete, onTogglePin, selectedIds, onToggleSelect, onSelectTag, enablePrefetch = true,
}: {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onTogglePin: (note: Note) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectTag?: (tag: string) => void
  enablePrefetch?: boolean
}) {
  const isSelected = selectedIds?.has(note.id) ?? false
  const router = useRouter()

  return (
    <Card
      onPointerEnter={() => {
        if (enablePrefetch) router.prefetch(`/notes/${note.id}`)
      }}
      size="sm"
      className={cn(
        'card-hover',
        note.done && 'opacity-50',
        isSelected && 'ring-2 ring-primary/50',
      )}
    >
      <CardHeader className="p-3 pb-0.5">
        <div className="flex items-start justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
            {onToggleSelect && (
              <button
                onClick={() => onToggleSelect(note.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              onClick={() => onTogglePin(note)}
              className="shrink-0 text-muted-foreground/30 hover:text-foreground transition-colors"
              title={note.pinned ? '取消置顶' : '置顶'}
            >
              {note.pinned ? (
                <Pin className="h-4 w-4 fill-foreground text-foreground" />
              ) : (
                <PinOff className="h-4 w-4" />
              )}
            </button>
            <CardTitle className="truncate text-sm font-medium" onClick={() => onEdit(note)}>
              {note.title || '无标题'}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0.5" onClick={() => onEdit(note)}>
        {note.content ? (
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {stripMarkdown(note.content, 200)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">空白笔记</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer text-[10px] hover:bg-primary/20 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onSelectTag?.(tag) }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <span>
            {formatNoteDate(note.createdAt)}
          </span>
          {note.dueDate && (
            <span className="text-amber-600">
              截止: {formatNoteDate(note.dueDate)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

NoteCard.displayName = 'NoteCard'

export { NoteCard }
