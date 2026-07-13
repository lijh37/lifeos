'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SkeletonNoteList } from '@/components/skeleton-card'
import { ChevronLeft, ChevronRight, PiggyBank, CheckCircle2, AlertCircle, Sparkles, Loader2 } from 'lucide-react'
import type { Budget } from '@/lib/types'
import { ProgressBar } from '@/components/progress-bar'
import { BudgetCard } from '@/components/budget-card'
import { BudgetForm } from '@/components/budget-form'

export default function BudgetPage() {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.toISOString().slice(0, 7))
  const [budget, setBudget] = useState<Budget | null>(null)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [savingActual, setSavingActual] = useState(false)

  const [fixedActualInput, setFixedActualInput] = useState('')
  const [variableActualInput, setVariableActualInput] = useState('')

  const fixedBudget = budget?.fixedBudget ?? 0
  const variableBudget = budget?.variableBudget ?? 0
  const fixedActual = budget?.fixedActual ?? null
  const variableActual = budget?.variableActual ?? null
  const hasActuals = fixedActual !== null && variableActual !== null
  const totalBudget = fixedBudget + variableBudget
  const totalActual = fixedActual !== null && variableActual !== null ? fixedActual + variableActual : 0
  const totalDiff = totalActual - totalBudget
  const isOverBudget = hasActuals && totalDiff > 0
  const isFutureMonth = currentMonth > now.toISOString().slice(0, 7)

  const syncInputs = useCallback((b: Budget | null) => {
    setFixedActualInput(b?.fixedActual !== null && b?.fixedActual !== undefined ? String(b.fixedActual) : '')
    setVariableActualInput(b?.variableActual !== null && b?.variableActual !== undefined ? String(b.variableActual) : '')
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [budgetRes, budgetsRes] = await Promise.all([
        fetch(`/api/budgets?month=${currentMonth}`),
        fetch('/api/budgets'),
      ])
      const bd = await budgetRes.json()
      const bl = await budgetsRes.json()
      setBudget(bd.budget)
      setBudgets(bl.budgets)
      syncInputs(bd.budget)
    } catch (e) {
      console.error('Failed to fetch budget data:', e)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, syncInputs])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveBudgetData(data: Record<string, unknown>) {
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, ...data }),
    })
    if (res.ok) {
      const result = await res.json()
      setBudget(result.budget)
    }
  }

  async function handleSaveActual() {
    setSavingActual(true)
    try {
      const fa = fixedActualInput ? parseFloat(fixedActualInput) : null
      const va = variableActualInput ? parseFloat(variableActualInput) : null
      await saveBudgetData({ fixedActual: fa, variableActual: va })
    } finally {
      setSavingActual(false)
    }
  }

  function handlePrev() {
    setCurrentMonth(format(subMonths(new Date(currentMonth + '-01'), 1), 'yyyy-MM'))
  }

  function handleNext() {
    setCurrentMonth(format(addMonths(new Date(currentMonth + '-01'), 1), 'yyyy-MM'))
  }

  const monthLabel = format(new Date(currentMonth + '-01'), 'yyyy年M月', { locale: zhCN })

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">月度预算</h1>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[120px] text-center text-base font-medium">{monthLabel}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleNext}
            disabled={isFutureMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {isFutureMonth && (
          <p className="mt-2 text-center text-xs text-amber-500">未来月份，可提前设置预算</p>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4">
            <SkeletonNoteList count={4} />
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <BudgetForm budget={budget} onSave={saveBudgetData} />

            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-medium">实际录入</h2>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">月底填写本月的实际支出</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">固定支出实际</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={fixedActualInput}
                        onChange={(e) => setFixedActualInput(e.target.value)}
                        placeholder="月底填写实际金额"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">浮动支出实际</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={variableActualInput}
                        onChange={(e) => setVariableActualInput(e.target.value)}
                        placeholder="月底填写实际金额"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
                    </div>
                  </div>
                  <Button size="sm" className="w-full" onClick={handleSaveActual} disabled={savingActual}>
                    {savingActual ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {savingActual ? '录入中...' : '录入实际'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {hasActuals && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    {isOverBudget ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-green-500" />
                    )}
                    <h2 className="text-sm font-medium">结算对比</h2>
                  </div>

                  <div className="space-y-3">
                    <ProgressBar label="固定支出" budget={fixedBudget} actual={fixedActual} />
                    <ProgressBar label="浮动支出" budget={variableBudget} actual={variableActual} />
                    <div className="border-t pt-2">
                      <ProgressBar label="总计" budget={totalBudget} actual={totalActual} />
                    </div>

                    <div className={`mt-3 rounded-lg p-3 text-center text-sm font-medium ${
                      isOverBudget
                        ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                        : 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400'
                    }`}>
                      {isOverBudget
                        ? `超支 ¥${totalDiff.toFixed(0)}`
                        : totalDiff === 0
                          ? '刚好用完预算'
                          : `预算结余 ¥${Math.abs(totalDiff).toFixed(0)}，控制得不错！`
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasActuals && (
              <Card>
                <CardContent className="p-4">
                  {isOverBudget ? (
                    <>
                      <div className="mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <h2 className="text-sm font-medium">超支说明</h2>
                      </div>
                      <Textarea
                        value={budget?.notes || ''}
                        onChange={(e) => saveBudgetData({ notes: e.target.value })}
                        placeholder="注明超支原因..."
                        className="min-h-[80px]"
                      />
                    </>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-green-500" />
                        <h2 className="text-sm font-medium">月度结算</h2>
                      </div>
                      <p className="mb-3 text-xs text-muted-foreground">恭喜！本月预算未超支，给自己点个赞吧 ✨</p>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors">
                          <Checkbox
                            checked={budget?.isCompleted ?? false}
                            onCheckedChange={(checked) => saveBudgetData({ isCompleted: checked })}
                          />
                          <div>
                            <p className="text-sm font-medium">预算达标</p>
                            <p className="text-xs text-muted-foreground">本月实际支出未超出预算</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors">
                          <Checkbox
                            checked={budget?.savingsCompleted ?? false}
                            onCheckedChange={(checked) => saveBudgetData({ savingsCompleted: checked })}
                          />
                          <div>
                            <p className="text-sm font-medium">完成强制存储</p>
                            <p className="text-xs text-muted-foreground">本月完成强制储蓄目标</p>
                          </div>
                        </label>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {budgets.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-medium text-muted-foreground">历史记录</h2>
                  </div>
                  <div className="space-y-2">
                    {budgets.map((b) => (
                      <BudgetCard key={b.id} budget={b} currentMonth={currentMonth} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
