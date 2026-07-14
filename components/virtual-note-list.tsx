'use client'

import { memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { NoteCard } from '@/components/note-card'
import type { Note } from '@/lib/types'

const VirtualNoteList = memo(function VirtualNoteList({
  notes, onEdit, onDelete, onTogglePin,
  selectedIds, onToggleSelect, onSelectTag,
  scrollRef,
}: {
  notes: Note[]
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onTogglePin: (note: Note) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectTag?: (tag: string) => void
  scrollRef: { current: HTMLDivElement | null }
}) {
  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 110,
    overscan: 10,
  })

  return (
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
              enablePrefetch={virtualItem.index < 20}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onSelectTag={onSelectTag}
            />
          </div>
        )
      })}
    </div>
  )
})

VirtualNoteList.displayName = 'VirtualNoteList'

export { VirtualNoteList }
