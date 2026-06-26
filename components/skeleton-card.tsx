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

export function SkeletonChat() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-2">
        <div className="flex items-center justify-end gap-2">
          <div className="h-8 w-20 rounded skeleton-pulse" />
        </div>
      </div>
      <div className="flex flex-1">
        <div className="hidden w-56 shrink-0 border-r bg-muted/30 md:block">
          <div className="border-b px-3 py-2">
            <div className="h-3 w-16 rounded skeleton-pulse" />
          </div>
          <div className="space-y-1 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md skeleton-pulse" />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-4">
            <div className="mx-auto max-w-2xl space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                    <div className="h-8 w-8 shrink-0 rounded-full skeleton-pulse" />
                    <div className="h-16 w-48 rounded-lg skeleton-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t p-4">
            <div className="mx-auto flex max-w-2xl gap-2">
              <div className="flex-1 h-11 rounded-md skeleton-pulse" />
              <div className="h-11 w-11 shrink-0 rounded-md skeleton-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return <SkeletonNoteList count={count} />
}
