import { Suspense } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'
import NoteDetailPage from './note-detail-page'

/**
 * 笔记详情页骨架屏 — 复用原 loading.tsx 骨架布局（匹配 note-detail-client.tsx 布局）
 */
function NoteDetailPageSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <div className="h-8 w-8 rounded-md skeleton-pulse" />
        <div className="h-6 flex-1 rounded skeleton-pulse" />
        <div className="h-8 w-8 rounded-md skeleton-pulse" />
      </header>

      {/* Editor area */}
      <div className="flex min-h-0 flex-1">
        <div className="m-4 flex flex-1 flex-col gap-3">
          <div className="h-4 w-3/4 rounded skeleton-pulse" />
          <div className="h-4 w-full rounded skeleton-pulse" />
          <div className="h-4 w-5/6 rounded skeleton-pulse" />
          <div className="h-4 w-2/3 rounded skeleton-pulse" />
          <div className="mt-2 h-4 w-full rounded skeleton-pulse" />
          <div className="h-4 w-4/5 rounded skeleton-pulse" />
        </div>
      </div>

      {/* Tags bar */}
      <div className="flex items-center gap-1.5 border-t px-4 py-2 shrink-0">
        <div className="h-5 w-14 rounded-full skeleton-pulse" />
        <div className="h-5 w-20 rounded-full skeleton-pulse" />
        <div className="h-5 w-16 rounded-full skeleton-pulse" />
      </div>
    </div>
  )
}

export default function NoteDetailRoutePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<NoteDetailPageSkeleton />}>
        <NoteDetailPage />
      </Suspense>
    </ErrorBoundary>
  )
}
