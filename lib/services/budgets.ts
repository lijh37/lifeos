/**
 * 预算服务（lib/services 环境分流层）
 *
 * - Capacitor 原生：直接调用 lib/db 模块（saveBudget 需将布尔/数值字段转换）
 * - Web / 测试：fetch('/api/budgets') 透传，调用形状与现有组件/API route 逐字一致
 */

import { isNativeCapacitor } from './env'
import { throwHttpError } from './http'
import type { Budget } from '@/lib/types'

/** 数值字段转 number（null/undefined 透传，NaN 转 undefined） */
export function numOrNull(v: unknown): number | null | undefined {
  if (v === undefined || v === null) return v
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}
/** 布尔字段转 boolean（undefined 透传） */
export function toBool(v: unknown): boolean | undefined {
  if (v === undefined) return undefined
  return v === true || v === 1 || v === 'true' || v === '1'
}

export async function fetchBudget(month: string): Promise<Budget | null> {
  if (isNativeCapacitor()) {
    const { getBudget } = await import('@/lib/db/native')
    return getBudget(month)
  }

  // cache: 'no-store' —— 预算由用户主动修改，POST 保存后 GET 缓存不失效会返回旧值（切月横跳 bug）
  const res = await fetch(`/api/budgets?month=${month}`, { cache: 'no-store' })
  if (!res.ok) await throwHttpError(res)
  const data = await res.json()
  return data.budget
}

export async function fetchAllBudgets(): Promise<Budget[]> {
  if (isNativeCapacitor()) {
    const { getBudgets } = await import('@/lib/db/native')
    return getBudgets()
  }

  // cache: 'no-store' —— 同 fetchBudget：避免保存后命中旧 HTTP 缓存
  const res = await fetch('/api/budgets', { cache: 'no-store' })
  if (!res.ok) await throwHttpError(res)
  const data = await res.json()
  return data.budgets
}

export async function saveBudget(month: string, data: Record<string, unknown>): Promise<Budget> {
  if (isNativeCapacitor()) {
    const { upsertBudget } = await import('@/lib/db/native')

    const clean: Partial<Budget> = {
      fixedBudget: numOrNull(data.fixedBudget) ?? undefined,
      variableBudget: numOrNull(data.variableBudget) ?? undefined,
      fixedActual: numOrNull(data.fixedActual) ?? undefined,
      variableActual: numOrNull(data.variableActual) ?? undefined,
      notes: typeof data.notes === 'string' ? data.notes : undefined,
      isCompleted: toBool(data.isCompleted),
      savingsCompleted: toBool(data.savingsCompleted),
    }
    return upsertBudget(month, clean)
  }

  const res = await fetch('/api/budgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, ...data }),
  })
  if (!res.ok) await throwHttpError(res)
  const result = await res.json()
  return result.budget
}

// ─── 校验函数（错误消息与 app/api/budgets/route.ts POST 逐字一致）───

export function validateBudgetInput(body: Record<string, unknown>): string | null {
  const { month, fixedBudget, variableBudget, fixedActual, variableActual, notes } = body
  if (!month || !/^\d{4}-\d{2}$/.test(month as string)) {
    return 'month must be in YYYY-MM format'
  }

  if (
    (fixedBudget !== undefined && numOrNull(fixedBudget) === undefined) ||
    (variableBudget !== undefined && numOrNull(variableBudget) === undefined) ||
    (fixedActual !== undefined && numOrNull(fixedActual) === undefined) ||
    (variableActual !== undefined && numOrNull(variableActual) === undefined)
  ) {
    return 'budget amounts must be numbers'
  }
  if (notes !== undefined && typeof notes !== 'string') {
    return 'notes must be a string'
  }
  return null
}
