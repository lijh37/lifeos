'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Notebook, PiggyBank, Trophy, Hash, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { typeLabels } from '@/lib/constants'

interface BudgetInfo {
  month: string
  fixedBudget: number
  variableBudget: number
  fixedActual: number | null
  variableActual: number | null
  isCompleted: boolean
}

interface StatsData {
  counts: { note: number; task: number; event: number }
  currentBudget: BudgetInfo | null
  habitCompletion7d: number
  topTags: { name: string; count: number }[]
  recentItems: { id: string; source: string; type: string; title: string; createdAt: string }[]
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const budgetInfo = data.currentBudget
  const budgetText = budgetInfo
    ? `¥${(budgetInfo.fixedBudget + budgetInfo.variableBudget).toFixed(0)}`
    : '未设置'

  const summaryCards = [
    { label: '笔记总数', value: data.counts.note + data.counts.task + data.counts.event, icon: Notebook, color: 'text-blue-500' },
    { label: '本月预算', value: budgetText, icon: PiggyBank, color: 'text-emerald-500' },
    { label: '7天打卡', value: `${data.habitCompletion7d} 次`, icon: Trophy, color: 'text-orange-500' },
    { label: '常用标签', value: data.topTags[0]?.name || '无', icon: Hash, color: 'text-purple-500' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">统计</h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            {summaryCards.map(card => (
              <Card key={card.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                    <span className="text-xs text-muted-foreground">{card.label}</span>
                  </div>
                  <p className={`mt-1 text-xl font-bold ${card.color}`}>
                    {card.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {budgetInfo && budgetInfo.fixedActual !== null && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">本月预算执行</h2>
                <div className="space-y-2">
                  <BudgetRow label="固定支出" budget={budgetInfo.fixedBudget} actual={budgetInfo.fixedActual ?? 0} />
                  <BudgetRow label="浮动支出" budget={budgetInfo.variableBudget} actual={budgetInfo.variableActual ?? 0} />
                  <div className="border-t pt-2">
                    <BudgetRow
                      label="总计"
                      budget={budgetInfo.fixedBudget + budgetInfo.variableBudget}
                      actual={(budgetInfo.fixedActual ?? 0) + (budgetInfo.variableActual ?? 0)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {data.topTags.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">热门标签</h2>
                <div className="flex flex-wrap gap-2">
                  {data.topTags.map((t: any, i: number) => (
                    <span key={t.name} className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      #{t.name}
                      <span className="text-muted-foreground">{t.count}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">最近动态</h2>
              <div className="space-y-2">
                {data.recentItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${
                      item.source === 'habit' ? 'bg-orange-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {typeLabels[item.type] || item.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(item.createdAt), 'MM/dd', { locale: zhCN })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}

function BudgetRow({ label, budget, actual }: { label: string; budget: number; actual: number }) {
  const diff = actual - budget
  const isOver = diff > 0
  const ratio = budget > 0 ? actual / budget : 0
  const pct = Math.min(ratio * 100, 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={isOver ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}>
          ¥{actual.toFixed(0)} / ¥{budget.toFixed(0)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${isOver ? 'bg-red-500' : ratio > 0.85 ? 'bg-amber-500' : 'bg-green-500'}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  )
}
