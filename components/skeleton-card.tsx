export function SkeletonCard({ count = 3 }: { count?: number }) {
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
