/**
 * 编辑页骨架屏 — 匹配 note-detail-client.tsx 布局
 */
export default function NoteDetailLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
        <div className="h-6 flex-1 rounded bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
      </header>

      {/* Editor area */}
      <div className="flex min-h-0 flex-1">
        <div className="m-4 flex flex-1 flex-col gap-3">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          <div className="mt-2 h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
        </div>
      </div>

      {/* Tags bar */}
      <div className="flex items-center gap-1.5 border-t px-4 py-2 shrink-0">
        <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
        <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
        <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  )
}
