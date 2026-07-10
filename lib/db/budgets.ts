import type { InValue } from '@libsql/client'
import type { Budget } from '../types'
import { getClient } from './client'
import { genId } from '../utils'

function rowToBudget(row: Record<string, unknown>): Budget {
  return {
    id: row.id as string,
    month: row.month as string,
    fixedBudget: row.fixed_budget as number,
    variableBudget: row.variable_budget as number,
    fixedActual: row.fixed_actual as number | null,
    variableActual: row.variable_actual as number | null,
    notes: row.notes as string,
    isCompleted: (row.is_completed as number) === 1,
    savingsCompleted: (row.savings_completed as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/**
 * 获取指定月份的预算记录。
 * @param month - 月份字符串（如 "2024-01"）
 * @returns 预算对象，未找到时返回 null
 */
export async function getBudget(month: string): Promise<Budget | null> {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM budgets WHERE month = ?',
    args: [month],
  })
  if (result.rows.length === 0) return null
  return rowToBudget(result.rows[0])
}

/**
 * 获取所有预算记录，按月降序排列。
 * @returns 预算对象数组
 */
export async function getBudgets(): Promise<Budget[]> {
  const db = getClient()
  const result = await db.execute('SELECT * FROM budgets ORDER BY month DESC')
  return result.rows.map(rowToBudget)
}

/**
 * 创建或更新指定月份的预算。如果已存在则更新部分字段，否则创建新预算记录。
 * @param month - 月份字符串（如 "2024-01"）
 * @param data - 预算的部分字段数据
 * @returns 更新后的完整预算对象
 */
export async function upsertBudget(month: string, data: Partial<Budget>): Promise<Budget> {
  const db = getClient()
  const existing = await getBudget(month)
  const now = new Date().toISOString()

  if (existing) {
    const fields: string[] = []
    const args: InValue[] = []
    if (data.fixedBudget !== undefined) { fields.push('fixed_budget = ?'); args.push(data.fixedBudget) }
    if (data.variableBudget !== undefined) { fields.push('variable_budget = ?'); args.push(data.variableBudget) }
    if (data.fixedActual !== undefined) { fields.push('fixed_actual = ?'); args.push(data.fixedActual) }
    if (data.variableActual !== undefined) { fields.push('variable_actual = ?'); args.push(data.variableActual) }
    if (data.notes !== undefined) { fields.push('notes = ?'); args.push(data.notes) }
    if (data.isCompleted !== undefined) { fields.push('is_completed = ?'); args.push(data.isCompleted ? 1 : 0) }
    if (data.savingsCompleted !== undefined) { fields.push('savings_completed = ?'); args.push(data.savingsCompleted ? 1 : 0) }
    fields.push('updated_at = ?')
    args.push(now)
    args.push(existing.id)
    await db.execute({
      sql: `UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`,
      args,
    })
    const clean = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as Record<string, unknown>
    return { ...existing, ...clean, updatedAt: now } as Budget
  }

  const budget: Budget = {
    id: genId(),
    month,
    fixedBudget: data.fixedBudget ?? 0,
    variableBudget: data.variableBudget ?? 0,
    fixedActual: data.fixedActual ?? null,
    variableActual: data.variableActual ?? null,
    notes: data.notes ?? '',
    isCompleted: data.isCompleted ?? false,
    savingsCompleted: data.savingsCompleted ?? false,
    createdAt: now,
    updatedAt: now,
  }
  await db.execute({
    sql: `INSERT INTO budgets (id, month, fixed_budget, variable_budget, fixed_actual, variable_actual, notes, is_completed, savings_completed, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [budget.id, budget.month, budget.fixedBudget, budget.variableBudget, budget.fixedActual, budget.variableActual, budget.notes, budget.isCompleted ? 1 : 0, budget.savingsCompleted ? 1 : 0, budget.createdAt, budget.updatedAt],
  })
  return budget
}

/**
 * 获取预算记录总数。
 * @returns 预算数量
 */
export async function getBudgetsCount(): Promise<number> {
  const db = getClient()
  const result = await db.execute('SELECT COUNT(*) as count FROM budgets')
  return result.rows[0]?.count as number || 0
}
