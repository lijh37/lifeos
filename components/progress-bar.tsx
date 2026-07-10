import { memo } from 'react'

const ProgressBar = memo(function ProgressBar({ label, budget: b, actual }: { label: string; budget: number; actual: number | null }) {
  if (actual === null) return null
  const ratio = b > 0 ? actual / b : 0
  const pct = Math.min(ratio * 100, 100)
  const diff = actual - b
  const over = diff > 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
                <span className={over ? 'text-red-500 font-medium whitespace-nowrap' : 'text-green-500 font-medium whitespace-nowrap'}>
                  ¥{actual.toFixed(0)} / ¥{b.toFixed(0)}
          {over ? ` (+¥${diff.toFixed(0)})` : ` (-¥${Math.abs(diff).toFixed(0)})`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            over ? 'bg-red-500' : ratio > 0.85 ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  )
})
ProgressBar.displayName = 'ProgressBar'

export { ProgressBar }
