import { memo } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CheckCircle2 } from 'lucide-react'
import type { Budget } from '@/lib/types'

const BudgetCard = memo(function BudgetCard({ budget, currentMonth }: { budget: Budget; currentMonth: string }) {
  const tb = budget.fixedBudget + budget.variableBudget
  const ta = (budget.fixedActual ?? 0) + (budget.variableActual ?? 0)
  const over = budget.fixedActual !== null && budget.variableActual !== null && ta > tb
  return (
    <div
      className={`flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-1 rounded-lg border p-3 text-sm transition-all duration-200 ${
        budget.month === currentMonth ? 'border-primary/50 bg-primary/5' : 'hover:border-border/80'
      }`}
    >
      <div>
        <p className="font-medium">
          {format(new Date(budget.month + '-01'), 'yyyy年M月', { locale: zhCN })}
        </p>
        <p className="text-xs text-muted-foreground">
          预算 ¥{tb.toFixed(0)}
          {budget.fixedActual !== null && ` · 实际 ¥${ta.toFixed(0)}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {budget.fixedActual !== null && (
          <span className={`text-xs font-medium ${over ? 'text-red-500' : 'text-green-500'}`}>
            {over ? '超支' : '达标'}
          </span>
        )}
        {budget.isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {budget.savingsCompleted && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[10px] text-green-700 dark:bg-green-900 dark:text-green-300">
            ¥
          </span>
        )}
      </div>
    </div>
  )
})
BudgetCard.displayName = 'BudgetCard'

export { BudgetCard }
