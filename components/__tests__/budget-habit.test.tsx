import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProgressBar } from '@/components/progress-bar'
import { BudgetCard } from '@/components/budget-card'
import { HabitRow, type HabitRowProps } from '@/components/habit-row'
import type { Budget, Habit } from '@/lib/types'

describe('ProgressBar', () => {
  it('should render green when under 85%', () => {
    const { container } = render(<ProgressBar label="固定支出" budget={10000} actual={8000} />)
    // 80% → green styling
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument()
  })

  it('should render amber when 85-100%', () => {
    const { container } = render(<ProgressBar label="浮动支出" budget={5000} actual={4500} />)
    // 90% → amber styling
    expect(container.querySelector('.bg-amber-500')).toBeInTheDocument()
  })

  it('should render red when overspent', () => {
    const { container } = render(<ProgressBar label="浮动支出" budget={5000} actual={6000} />)
    // Overspend → red styling
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument()
    // The overspend indicator should show +¥1000
    expect(screen.getByText(/\+¥1000/)).toBeInTheDocument()
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

  it('should highlight overspend', () => {
    const overspent: Budget = {
      ...baseBudget,
      fixedActual: 12000,
      variableActual: 6000,
    }
    const { container } = render(<BudgetCard budget={overspent} currentMonth="2026-06" />)
    expect(container.querySelector('.text-red-500')).toBeInTheDocument()
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
  const onEdit = vi.fn()
  const onEditValueChange = vi.fn()
  const onEditConfirm = vi.fn()
  const onEditCancel = vi.fn()

  const baseProps: HabitRowProps = {
    habit,
    done: false,
    streak: 0,
    bestStreak: 0,
    weekCount: 0,
    monthCount: 0,
    totalCompletions: 0,
    today: '2026-07-01',
    onToggle,
    onDelete,
    onEdit,
    isEditing: false,
    editValue: '',
    onEditValueChange,
    onEditConfirm,
    onEditCancel,
  }

  it('should render habit name and description', () => {
    render(<HabitRow {...baseProps} />)
    expect(screen.getByText('每天跑步')).toBeInTheDocument()
    expect(screen.getByText('跑5公里')).toBeInTheDocument()
  })

  it('should call onToggle when circle icon is clicked', () => {
    const { container } = render(<HabitRow {...baseProps} />)
    // Toggle button is the first button (wrapping CheckCircle/Circle SVG)
    const toggleBtn = container.querySelector('button')
    fireEvent.click(toggleBtn!)
    expect(onToggle).toHaveBeenCalledWith('1', '2026-07-01')
  })

  it('should call onDelete when trash icon is clicked', () => {
    const { container } = render(<HabitRow {...baseProps} />)
    // Delete button is the last button (Trash2 icon, text-destructive class)
    const buttons = container.querySelectorAll('button')
    const deleteBtn = buttons[buttons.length - 1]
    fireEvent.click(deleteBtn)
    expect(onDelete).toHaveBeenCalledWith('1')
  })
})
