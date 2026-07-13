import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProgressBar } from '@/components/progress-bar'
import { BudgetCard } from '@/components/budget-card'
import { HabitRow, type HabitRowProps } from '@/components/habit-row'
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

  it('should show streak when > 0', () => {
    render(<HabitRow {...baseProps} done={true} streak={5} bestStreak={10} />)
    expect(screen.getByText(/5天/)).toBeInTheDocument()
  })

  it('should show completion check when done', () => {
    const { container } = render(<HabitRow {...baseProps} done={true} />)
    // The CheckCircle icon has text-green-500 class when done
    expect(container.querySelector('.text-green-500')).toBeTruthy()
  })

  it('should show best streak when different from current streak', () => {
    render(<HabitRow {...baseProps} streak={3} bestStreak={10} />)
    expect(screen.getByText('3天')).toBeInTheDocument()
    expect(screen.getByText('10天')).toBeInTheDocument()
  })

  it('should show weekly/monthly/total stats', () => {
    render(<HabitRow {...baseProps} weekCount={5} monthCount={20} totalCompletions={100} />)
    expect(screen.getByText(/本周 5 次/)).toBeInTheDocument()
    expect(screen.getByText(/本月 20 次/)).toBeInTheDocument()
    expect(screen.getByText(/累计 100 次/)).toBeInTheDocument()
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

  it('should call onEdit when pencil icon is clicked', () => {
    const { container } = render(<HabitRow {...baseProps} />)
    // Edit button has Pencil icon, rendered before delete when !isEditing
    const buttons = container.querySelectorAll('button')
    const editBtn = buttons[buttons.length - 2]
    fireEvent.click(editBtn)
    expect(onEdit).toHaveBeenCalledWith(habit)
  })

  it('should show edit input when isEditing is true', () => {
    render(<HabitRow {...baseProps} isEditing={true} editValue="新名称" />)
    const input = screen.getByDisplayValue('新名称')
    expect(input).toBeInTheDocument()
  })

  it('should call onEditValueChange when editing input changes', () => {
    render(<HabitRow {...baseProps} isEditing={true} editValue="" />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '新习惯名' } })
    expect(onEditValueChange).toHaveBeenCalledWith('新习惯名')
  })

  it('should call onEditConfirm when Enter key is pressed in edit mode', () => {
    render(<HabitRow {...baseProps} isEditing={true} editValue="name" />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onEditConfirm).toHaveBeenCalled()
  })

  it('should call onEditCancel when Escape key is pressed in edit mode', () => {
    render(<HabitRow {...baseProps} isEditing={true} editValue="name" />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onEditCancel).toHaveBeenCalled()
  })

  it('should show confirm and cancel buttons in edit mode instead of pencil', () => {
    const { container } = render(<HabitRow {...baseProps} isEditing={true} editValue="name" />)
    // In edit mode: input field + confirm button (Check) + cancel button (X) + delete (Trash2)
    const input = container.querySelector('input')
    expect(input).toBeInTheDocument()
    expect(container.querySelectorAll('button').length).toBe(4) // toggle + confirm + cancel + delete
  })
})
