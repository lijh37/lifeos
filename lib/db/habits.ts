import type { InValue } from '@libsql/client'
import type { Habit } from '../types'
import { getClient } from './client'
import { genId } from '../utils'

function rowToHabit(row: Record<string, unknown>): Habit {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    frequency: row.frequency as 'daily' | 'weekly',
    createdAt: row.created_at as string,
  }
}

/**
 * 创建一条新习惯记录。
 * @param habit - 完整的习惯对象
 * @returns 创建后的习惯对象
 */
export async function createHabit(habit: Habit): Promise<Habit> {
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO habits (id, name, description, frequency, created_at) VALUES (?, ?, ?, ?, ?)`,
    args: [habit.id, habit.name, habit.description, habit.frequency, habit.createdAt],
  })
  return habit
}

/**
 * 获取所有习惯记录，按创建时间降序排列。
 * @returns 习惯对象数组
 */
export async function getHabits(): Promise<Habit[]> {
  const db = getClient()
  const result = await db.execute('SELECT * FROM habits ORDER BY created_at DESC')
  return result.rows.map(rowToHabit)
}

/**
 * 删除指定习惯及其所有打卡记录。
 * @param id - 要删除的习惯 ID
 */
export async function deleteHabit(id: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM habits WHERE id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM habit_completions WHERE habit_id = ?', args: [id] })
}

/**
 * 切换习惯在指定日期的打卡状态（已完成/未完成）。如果当天无记录则新建打卡。
 * @param habitId - 习惯 ID
 * @param date - 日期字符串（YYYY-MM-DD）
 * @returns 切换后的完成状态（true 为已完成）
 */
export async function toggleCompletion(habitId: string, date: string): Promise<boolean> {
  const db = getClient()
  const existing = await db.execute({
    sql: 'SELECT id, completed FROM habit_completions WHERE habit_id = ? AND date = ?',
    args: [habitId, date],
  })
  if (existing.rows.length > 0) {
    const row = existing.rows[0]
    const newCompleted = (row.completed as number) === 0 ? 1 : 0
    await db.execute({
      sql: 'UPDATE habit_completions SET completed = ? WHERE id = ?',
      args: [newCompleted, row.id],
    })
    return newCompleted === 1
  } else {
    await db.execute({
      sql: 'INSERT INTO habit_completions (id, habit_id, date, completed, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [genId(), habitId, date, 1, new Date().toISOString()],
    })
    return true
  }
}

/**
 * 计算每个习惯的连续打卡天数，从今天开始向前追溯最多 365 天。
 * @returns 以 habit_id 为键、连续打卡天数为值的映射
 */
export async function getStreaks(): Promise<Record<string, number>> {
  const db = getClient()
  const rows = (await db.execute(
    `SELECT habit_id, date FROM habit_completions WHERE completed = 1 ORDER BY habit_id, date DESC`
  )).rows

  const streaks: Record<string, number> = {}
  const today = new Date().toISOString().slice(0, 10)

  for (let i = 0; i < rows.length; ) {
    const hid = rows[i].habit_id as string
    if (streaks[hid] !== undefined) { i++; continue }

    let streak = 0
    const cutoff = new Date()
    for (let j = 0; j < 365; j++) {
      const dateStr = cutoff.toISOString().slice(0, 10)
      if (i < rows.length && rows[i].habit_id === hid && rows[i].date === dateStr) {
        streak++
        i++
      } else if (j > 0 || dateStr !== today) {
        break
      }
      cutoff.setDate(cutoff.getDate() - 1)
    }
    streaks[hid] = streak
  }
  return streaks
}

/**
 * 获取所有习惯在今天（按本地日期）的打卡状态。
 * @returns 以 habit_id 为键、完成状态为值的映射
 */
export async function getTodayCompletions(): Promise<Record<string, boolean>> {
  const today = new Date().toISOString().slice(0, 10)
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT habit_id, completed FROM habit_completions WHERE date = ?',
    args: [today],
  })
  const map: Record<string, boolean> = {}
  for (const row of result.rows) {
    map[row.habit_id as string] = (row.completed as number) === 1
  }
  return map
}

/**
 * 按关键词搜索习惯（名称或描述），返回最多 50 条结果。
 * @param query - 搜索关键词
 * @returns 匹配的习惯数组
 */
export async function searchHabits(query: string): Promise<Habit[]> {
  const term = `%${query}%`
  const db = getClient()
  const result = await db.execute({
    sql: `SELECT * FROM habits WHERE name LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT 50`,
    args: [term, term],
  })
  return result.rows.map(rowToHabit)
}

/**
 * 获取习惯记录总数。
 * @returns 习惯数量
 */
export async function getHabitsCount(): Promise<number> {
  const db = getClient()
  const result = await db.execute('SELECT COUNT(*) as count FROM habits')
  return result.rows[0]?.count as number || 0
}
