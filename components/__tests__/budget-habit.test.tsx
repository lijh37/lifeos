import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from '@/components/progress-bar'
import { BudgetCard } from '@/components/budget-card'
import { HabitRow } from '@/app/habits/page'
import type { Budget, Habit } from '@/lib/types'

describe('ProgressBar', () => {
  it('should render budget vs actual', () => {
    render(<ProgressBar label="固定支出" budget={10000} actual={8000} />)
    expect(screen.getByText(/固定支出/)).toBeInTheDocument()
    expect(screen.getByText(/8000/)).toBeInTheDocument()
  })

  it('should show overspend in red', () => {
    render(<ProgressBar label="浮动支出" budget={5000} actual={6000} />)
    // The overspend indicator should show +¥1000
    expect(screen.getByText(/\+¥1000/)).toBeInTheDocument()
  })

  it('should return null when actual is null', () => {
    const { container } = render(<ProgressBar label="测试" budget={1000} actual={null} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('BudgetCard', () => {
  const baseBudget: Budget = {
    id: '1',
    month: '2026-06',
    fixedBudget: 10000,
    variableBudget: 5000,
    fixedActual: 8000,
    variableActual: 4000,
    isCompleted: false,
    savingsCompleted: false,
    notes: '',
    createdAt: '',
    updatedAt: '',
  }

  it('should render budget month and total', () => {
    render(<BudgetCard budget={baseBudget} currentMonth="2026-06" />)
    expect(screen.getByText(/2026年6月/)).toBeInTheDocument()
  })

  it('should highlight current month', () => {
    const { container } = render(<BudgetCard budget={baseBudget} currentMonth="2026-06" />)
    expect(container.querySelector('.border-primary\\/50')).toBeInTheDocument()
  })

  it('should not highlight non-current month', () => {
    const { container } = render(<BudgetCard budget={{...baseBudget, month: '2026-05'}} currentMonth="2026-06" />)
    expect(container.querySelector('.border-primary\\/50')).toBeNull()
  })
})

describe('HabitRow', () => {
  const habit: Habit = {
    id: '1',
    name: '每天跑步',
    description: '跑5公里',
    frequency: 'daily',
    createdAt: new Date().toISOString(),
  }
  const onToggle = vi.fn()
  const onDelete = vi.fn()

  it('should render habit name and description', () => {
    render(<HabitRow habit={habit} done={false} streak={0} today="2026-07-01" onToggle={onToggle} onDelete={onDelete} />)
    expect(screen.getByText('每天跑步')).toBeInTheDocument()
    expect(screen.getByText('跑5公里')).toBeInTheDocument()
  })

  it('should show streak when > 0', () => {
    render(<HabitRow habit={habit} done={true} streak={5} today="2026-07-01" onToggle={onToggle} onDelete={onDelete} />)
    expect(screen.getByText(/5天/)).toBeInTheDocument()
  })

  it('should show completion check when done', () => {
    const { container } = render(<HabitRow habit={habit} done={true} streak={0} today="2026-07-01" onToggle={onToggle} onDelete={onDelete} />)
    // The CheckCircle icon has text-green-500 class when done
    expect(container.querySelector('.text-green-500')).toBeTruthy()
  })
})
