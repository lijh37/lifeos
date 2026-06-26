'use client'

import { NoteList } from '@/components/note-list'
import { ErrorBoundary } from '@/components/error-boundary'

export default function TasksPage() {
  return (
    <ErrorBoundary>
      <NoteList defaultFilter="task" />
    </ErrorBoundary>
  )
}
