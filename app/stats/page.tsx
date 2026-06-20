'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Notebook, Wallet, Trophy, Hash, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const typeLabels: Record<string, string> = {
  note: '笔记', task: '任务', event: '事件', expense: '支出', income: '收入', habit: '习惯',
}

const categoryColors: Record<string, string> = {
  餐饮: 'bg-orange-500', 交通: 'bg-blue-500', 购物: 'bg-pink-500',
  娱乐: 'bg-purple-500', 医疗: 'bg-red-500', 教育: 'bg-cyan-500',
  住房: 'bg-green-500', 工资: 'bg-emerald-500', 其他: 'bg-gray-400',
}

export default function StatsPage() {
  const [data, setData] = useState<any>(null)
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

  const totalEntries = data.counts.note + data.counts.task + data.counts.event + data.expensesThisMonth > 0 ? 1 : 0

  const summaryCards = [
    { label: '笔记总数', value: data.counts.note + data.counts.task + data.counts.event, icon: Notebook, color: 'text-blue-500' },
    { label: '本月支出', value: `¥${data.expensesThisMonth.toFixed(1)}`, icon: Wallet, color: 'text-red-500' },
    { label: '7天打卡', value: `${data.habitCompletion7d} 次`, icon: Trophy, color: 'text-orange-500' },
    { label: '常用标签', value: data.topTags[0]?.name || '无', icon: Hash, color: 'text-purple-500' },
  ]

  const maxExpense = Math.max(...data.expenseCategories.map((c: any) => c.total), 1)

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

          {data.expenseCategories.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">本月支出分类</h2>
                <div className="space-y-2">
                  {data.expenseCategories.map((c: any) => {
                    const pct = (c.total / maxExpense) * 100
                    const barColor = categoryColors[c.category] || 'bg-gray-400'
                    return (
                      <div key={c.category} className="flex items-center gap-2 text-xs">
                        <span className="w-8 shrink-0 text-right text-muted-foreground">{c.category}</span>
                        <div className="h-5 flex-1 rounded-sm bg-muted">
                          <div className={`h-full rounded-sm ${barColor}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                        </div>
                        <span className="w-16 shrink-0 text-right font-medium">¥{c.total.toFixed(1)}</span>
                      </div>
                    )
                  })}
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
                      item.source === 'expense' ? 'bg-green-500' :
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
