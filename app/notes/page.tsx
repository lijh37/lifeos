import { Suspense } from 'react'
import { NoteList } from '@/components/note-list'
import { ErrorBoundary } from '@/components/error-boundary'

function NotesPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Search bar skeleton */}
      <div className="border-b px-4 py-3">
        <div className="h-9 w-full rounded-md skeleton-pulse" />
        <div className="mt-2 flex items-center gap-1">
          <div className="h-6 w-14 rounded-full skeleton-pulse" />
          <div className="h-6 w-20 rounded-full skeleton-pulse" />
          <div className="h-6 w-16 rounded-full skeleton-pulse" />
          <div className="h-6 w-12 rounded-full skeleton-pulse" />
          <div className="ml-auto h-7 w-7 rounded-md skeleton-pulse" />
        </div>
      </div>
      {/* List skeleton */}
      <div className="flex-1 space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="h-9 w-9 shrink-0 rounded-full skeleton-pulse" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-2/3 rounded skeleton-pulse" />
              <div className="h-3 w-1/3 rounded skeleton-pulse" />
            </div>
          </div>
        ))}
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
