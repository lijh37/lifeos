/**
 * 习惯服务（lib/services 环境分流层）
 *
 * - Capacitor 原生：直接调用 lib/db 模块（toggle 分支复刻 app/api/habits/route.ts 的统计提取）
 * - Web / 测试：fetch('/api/habits') 透传，调用形状与现有组件/API route 逐字一致
 */

import { isNativeCapacitor } from './env'
import { throwHttpError } from './http'
import { localDateStr } from '@/lib/utils'
import type { Habit } from '@/lib/types'

/** 补记窗口天数：允许补记今天、昨天、前天（窗口内最早是前天）。 */
export const BACKFILL_WINDOW_DAYS = 3

export interface HabitDashboard {
  habits: Habit[]
  todayCompletions: Record<string, boolean>
  streaks: Record<string, number>
  bestStreaks: Record<string, number>
  perHabitRates: Record<string, number>
  perHabitTotals: Record<string, number>
  perHabitWeek: Record<string, number>
  perHabitMonth: Record<string, number>
  recentDays: Record<string, { date: string; completed: boolean; isBackfilled: boolean }[]>
}

export interface ToggleResult {
  completed: boolean
  streak: number
  bestStreak: number
  weekCount: number
  monthCount: number
  totalCompletions: number
  isBackfilled: boolean
  /** 当月完成率（%），与 dashboard perHabitRates 同公式，用于实时刷新完成率进度条 */
  rate: number
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 校验 date 为合法真实日期（YYYY-MM-DD）。 */
function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/**
 * 校验打卡/补记日期（纯函数，route 与 Capacitor 原生分支共用）。
 *
 * 边界行为：
 * - 非法 YYYY-MM-DD（格式错/不存在的日期）→ 'invalid date'
 * - date > 今天（本地）→ 'Cannot check in future dates'
 * - date < 前天（本地，BACKFILL_WINDOW_DAYS=3）→ 'Can only backfill the last 3 days'
 * - 其余（今天、昨天、前天）→ null
 */
export function validateToggleDate(date: string, today: Date = new Date()): string | null {
  if (typeof date !== 'string' || !isValidDate(date)) return 'invalid date'
  const todayStr = localDateStr(today)
  if (date > todayStr) return 'Cannot check in future dates'
  const earliest = new Date(today)
  earliest.setDate(today.getDate() - (BACKFILL_WINDOW_DAYS - 1))
  if (date < localDateStr(earliest)) return 'Can only backfill the last 3 days'
  return null
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
    const err = validateToggleDate(date)
    if (err) throw new Error(err)
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
      isBackfilled: completed && date !== localDateStr(),
      rate: dashboard.perHabitRates[habitId] ?? 0,
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
