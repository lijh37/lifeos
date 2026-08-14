'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, Square, Pin, PinOff } from 'lucide-react'
import { stripMarkdown } from '@/lib/strip-markdown'
import type { Note } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatNoteDate } from '@/components/format-note-date'

const NoteCard = memo(function NoteCard({
  note, onEdit, onDelete, onTogglePin, selectedIds, onToggleSelect, onSelectTag, dense = false,
}: {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onTogglePin: (note: Note) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectTag?: (tag: string) => void
  dense?: boolean
}) {
  const isSelected = selectedIds?.has(note.id) ?? false

  if (dense) {
    return (
      <div
        onClick={() => onEdit(note)}
        className={cn(
          'flex items-center gap-1.5 rounded-2xl bg-card py-1.5 pl-2 pr-2 text-sm shadow-sm ring-1 ring-foreground/5 transition-all duration-200',
          note.done && 'opacity-60',
          isSelected && 'bg-primary/5 ring-2 ring-primary/60',
        )}
      >
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {onToggleSelect && (
            <button
              onClick={() => onToggleSelect(note.id)}
              className="text-muted-foreground hover:text-foreground"
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
        </div>
        <span className="min-w-0 flex-1 truncate font-medium">{note.title || '无标题'}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatNoteDate(note.createdAt)}
        </span>
      </div>
    )
  }

  return (
    <Card
      size="sm"
      className={cn(
        'rounded-2xl shadow-sm ring-1 ring-foreground/5 transition-all duration-200',
        note.done && 'opacity-60',
        note.pinned && 'border-l-[3px] border-l-primary',
        isSelected && 'bg-primary/5 ring-2 ring-primary/60',
      )}
    >
      <CardHeader className="p-2 pb-0.5">
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
            <CardTitle
              className={cn(
                'truncate text-sm font-medium transition-colors',
                note.done && 'line-through text-muted-foreground',
              )}
              onClick={() => onEdit(note)}
            >
              {note.title || '无标题'}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0.5" onClick={() => onEdit(note)}>
        {note.content ? (
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {stripMarkdown(note.content, 200)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">空白笔记</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer text-[11px] h-5 hover:bg-primary/20 transition-colors"
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
