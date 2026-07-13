export function SkeletonNoteList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <div className="h-9 w-9 shrink-0 rounded-full skeleton-pulse" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-4 w-2/3 rounded skeleton-pulse" />
            <div className="h-3 w-1/3 rounded skeleton-pulse" />
          </div>
          <div className="h-4 w-14 shrink-0 rounded skeleton-pulse" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonHabits({ count = 4 }: { count?: number }) {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-card p-3">
            <div className="mx-auto mb-2 h-4 w-4 rounded skeleton-pulse" />
            <div className="mx-auto h-6 w-12 rounded skeleton-pulse" />
            <div className="mx-auto mt-1 h-3 w-10 rounded skeleton-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-card p-3">
        <div className="mb-2 h-3 w-20 rounded skeleton-pulse" />
        <div className="flex items-end gap-1.5" style={{ height: 48 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-t skeleton-pulse" style={{ height: `${20 + Math.random() * 60}%` }} />
          ))}
        </div>
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <div className="h-6 w-6 shrink-0 rounded-full skeleton-pulse" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-4 w-1/2 rounded skeleton-pulse" />
            <div className="h-3 w-1/4 rounded skeleton-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

