'use client'

import { useEffect, useState, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Target, Loader2 } from 'lucide-react'
import type { Budget } from '@/lib/types'

const BudgetForm = memo(function BudgetForm({ budget, onSave }: { budget: Budget | null; onSave: (data: Record<string, unknown>) => void }) {
  const [fixedBudgetInput, setFixedBudgetInput] = useState('')
  const [variableBudgetInput, setVariableBudgetInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFixedBudgetInput(budget ? String(budget.fixedBudget) : '')
    setVariableBudgetInput(budget ? String(budget.variableBudget) : '')
  }, [budget])

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        fixedBudget: fixedBudgetInput ? parseFloat(fixedBudgetInput) : 0,
        variableBudget: variableBudgetInput ? parseFloat(variableBudgetInput) : 0,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">预算设定</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              固定支出预算 <span className="text-[10px]">（住房/房贷/租房/电话费等）</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                value={fixedBudgetInput}
                onChange={(e) => setFixedBudgetInput(e.target.value)}
                placeholder="例: 3200"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              浮动支出预算 <span className="text-[10px]">（交通/饮食/衣服/聚餐等）</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                value={variableBudgetInput}
                onChange={(e) => setVariableBudgetInput(e.target.value)}
                placeholder="例: 1700"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="rounded-lg bg-muted px-3 py-1.5 text-sm">
              总预算：<span className="font-bold">
                ¥{((fixedBudgetInput ? parseFloat(fixedBudgetInput) : 0) + (variableBudgetInput ? parseFloat(variableBudgetInput) : 0)).toFixed(0)}
              </span>
            </span>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? '保存中...' : '保存预算'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export { BudgetForm }
