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
    <div className="space-y-2 p-4">
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

export function SkeletonBudgets() {
  return (
    <div className="space-y-3 p-4">
      {/* BudgetForm skeleton */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="h-4 w-24 rounded skeleton-pulse" />
        <div className="h-9 w-full rounded-md skeleton-pulse" />
        <div className="h-4 w-24 rounded skeleton-pulse" />
        <div className="h-9 w-full rounded-md skeleton-pulse" />
        <div className="h-8 w-20 rounded-md skeleton-pulse" />
      </div>

      {/* Actual input Card skeleton */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="h-4 w-20 rounded skeleton-pulse" />
        <div className="h-9 w-full rounded-md skeleton-pulse" />
        <div className="h-9 w-full rounded-md skeleton-pulse" />
        <div className="h-8 w-full rounded-md skeleton-pulse" />
      </div>

      {/* History Card skeleton */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="h-4 w-20 rounded skeleton-pulse" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border p-3">
            <div className="h-4 w-16 rounded skeleton-pulse" />
            <div className="h-4 w-12 rounded skeleton-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

