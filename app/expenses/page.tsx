'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowDown, ArrowUp, Trash2, Wallet } from 'lucide-react'
import { ExportButton } from '@/components/export-button'
import { SkeletonCard } from '@/components/skeleton-card'
import type { Expense } from '@/lib/types'

const categoryLabels: Record<string, string> = {
  餐饮: '餐饮',
  交通: '交通',
  购物: '购物',
  娱乐: '娱乐',
  医疗: '医疗',
  教育: '教育',
  住房: '住房',
  工资: '工资',
  其他: '其他',
}

const categoryColors: Record<string, string> = {
  餐饮: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  交通: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  购物: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  娱乐: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  医疗: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  教育: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  住房: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  工资: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  其他: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all')

  async function handleDelete(id: string) {
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  useEffect(() => {
    fetch('/api/expenses')
      .then((res) => res.json())
      .then((data) => setExpenses(data.expenses))
      .catch((e) => console.error('Failed to fetch expenses:', e))
      .finally(() => setLoading(false))
  }, [])

  const displayExpenses = expenses.filter(
    (e) => filterType === 'all' || e.type === filterType
  )

  const totalExpense = displayExpenses
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)

  const totalIncome = displayExpenses
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0)

  const filters: { value: 'all' | 'expense' | 'income'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'expense', label: '支出' },
    { value: 'income', label: '收入' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">记账</h1>
          </div>
          <ExportButton type="expenses" />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">支出</p>
              <p className="text-lg font-bold text-red-500">
                ¥{totalExpense.toFixed(1)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">收入</p>
              <p className="text-lg font-bold text-green-500">
                ¥{totalIncome.toFixed(1)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">净收支</p>
              <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ¥{(totalIncome - totalExpense).toFixed(1)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 flex gap-1">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filterType === f.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterType(f.value)}
              className="text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {expenses.filter(e => e.type === 'expense').length > 0 && (() => {
          const thisMonth = new Date().toISOString().slice(0, 7)
          const monthly = expenses.filter(e => e.type === 'expense' && e.createdAt.startsWith(thisMonth))
          const byCategory: Record<string, number> = {}
          monthly.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount })
          const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
          const maxAmount = sorted[0]?.[1] || 1

          return (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-muted-foreground">本月支出分类</p>
              {sorted.map(([cat, amt]) => {
                const pct = (amt / maxAmount) * 100
                const barColor = categoryColors[cat]?.split(' ')[0] || 'bg-gray-100'
                return (
                  <div key={cat} className="flex items-center gap-2 text-xs">
                    <span className="w-8 shrink-0 text-right text-muted-foreground">{cat}</span>
                    <div className="h-4 flex-1 rounded-sm bg-muted">
                      <div
                        className={`h-full rounded-sm ${barColor}`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right font-medium">¥{amt.toFixed(1)}</span>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4">
            <SkeletonCard count={5} />
          </div>
        ) : displayExpenses.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            还没有收支记录，去 AI 对话页面添加吧
          </div>
        ) : (
          <div className="space-y-1 p-4 animate-stagger">
            {displayExpenses.map((expense) => (
              <Card key={expense.id} className="card-hover">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    expense.type === 'expense'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                      : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                  }`}>
                    {expense.type === 'expense' ? (
                      <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {expense.description || expense.category}
                      </span>
                      <Badge className={categoryColors[expense.category] || categoryColors['其他']}>
                        {categoryLabels[expense.category] || expense.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(expense.createdAt), 'MM/dd HH:mm', { locale: zhCN })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${
                      expense.type === 'expense' ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {expense.type === 'expense' ? '-' : '+'}¥{expense.amount.toFixed(1)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(expense.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
