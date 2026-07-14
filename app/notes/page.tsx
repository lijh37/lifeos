import { Suspense } from 'react'
import { NoteList } from '@/components/note-list'
import { ErrorBoundary } from '@/components/error-boundary'
import { SkeletonNoteList } from '@/components/skeleton-card'

function NotesPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Search bar skeleton */}
      <div className="border-b px-4 py-3">
        <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
        <div className="mt-2 flex items-center gap-1">
          <div className="h-6 w-14 rounded-full bg-muted animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
          <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
          <div className="h-6 w-12 rounded-full bg-muted animate-pulse" />
          <div className="ml-auto h-7 w-7 rounded-md bg-muted animate-pulse" />
        </div>
      </div>
      {/* List skeleton */}
      <div className="flex-1 p-4">
        <SkeletonNoteList count={6} />
      </div>
    </div>
  )
}

export default function NotesPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<NotesPageSkeleton />}>
        <NoteList />
      </Suspense>
    </ErrorBoundary>
  )
}
