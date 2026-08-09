/**
 * 习惯服务（lib/services 环境分流层）
 *
 * - Capacitor 原生：直接调用 lib/db 模块（toggle 分支复刻 app/api/habits/route.ts 的统计提取）
 * - Web / 测试：fetch('/api/habits') 透传，调用形状与现有组件/API route 逐字一致
 */

import { isNativeCapacitor } from './env'
import { throwHttpError } from './http'
import type { Habit } from '@/lib/types'

export interface HabitDashboard {
  habits: Habit[]
  todayCompletions: Record<string, boolean>
  streaks: Record<string, number>
  bestStreaks: Record<string, number>
  perHabitRates: Record<string, number>
  perHabitTotals: Record<string, number>
  perHabitWeek: Record<string, number>
  perHabitMonth: Record<string, number>
}

export interface ToggleResult {
  completed: boolean
  streak: number
  bestStreak: number
  weekCount: number
  monthCount: number
  totalCompletions: number
}

export async function fetchHabitsDashboard(): Promise<HabitDashboard> {
  if (isNativeCapacitor()) {
    const { getHabitsDashboard } = await import('@/lib/db/native')
    return getHabitsDashboard()
  }

  const res = await fetch('/api/habits')
  if (!res.ok) await throwHttpError(res)
  return res.json()
}

export async function toggleHabit(habitId: string, date: string): Promise<ToggleResult> {
  if (isNativeCapacitor()) {
    const { toggleCompletion, getHabitsDashboard } = await import('@/lib/db/native')
    const completed = await toggleCompletion(habitId, date)
    // 复用 dashboard 查询计算该习惯的统计（仿 API route POST toggle 分支）
    const dashboard = await getHabitsDashboard()
    return {
      completed,
      streak: dashboard.streaks[habitId] ?? 0,
      bestStreak: dashboard.bestStreaks[habitId] ?? 0,
      weekCount: dashboard.perHabitWeek[habitId] ?? 0,
      monthCount: dashboard.perHabitMonth[habitId] ?? 0,
      totalCompletions: dashboard.perHabitTotals[habitId] ?? 0,
    }
  }

  const res = await fetch('/api/habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _action: 'toggle', habitId, date }),
  })
  if (!res.ok) await throwHttpError(res)
  return res.json()
}

export async function createHabit(name: string, description?: string): Promise<Habit> {
  if (isNativeCapacitor()) {
    const { createHabit: dbCreateHabit } = await import('@/lib/db/native')
    const habit: Habit = {
      id: crypto.randomUUID(),
      name,
      description: description ?? '',
      frequency: 'daily',
      createdAt: new Date().toISOString(),
    }
    return dbCreateHabit(habit)
  }

  const res = await fetch('/api/habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
  if (!res.ok) await throwHttpError(res)
  const data = await res.json()
  return data.habit
}

export async function updateHabit(id: string, name: string, description?: string): Promise<void> {
  if (isNativeCapacitor()) {
    const { updateHabit: dbUpdateHabit } = await import('@/lib/db/native')
    return dbUpdateHabit(id, name, description || '')
  }

  const res = await fetch('/api/habits', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, description }),
  })
  if (!res.ok) await throwHttpError(res)
}

export async function deleteHabit(id: string): Promise<void> {
  if (isNativeCapacitor()) {
    const { deleteHabit: dbDeleteHabit } = await import('@/lib/db/native')
    return dbDeleteHabit(id)
  }

  const res = await fetch(`/api/habits?id=${id}`, { method: 'DELETE' })
  if (!res.ok) await throwHttpError(res)
}
