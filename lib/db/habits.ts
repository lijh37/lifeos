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
 * 更新习惯的名称和描述。
 * @param id - 习惯 ID
 * @param name - 新名称
 * @param description - 新描述
 */
export async function updateHabit(id: string, name: string, description: string): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: `UPDATE habits SET name = ?, description = ? WHERE id = ?`,
    args: [name, description, id],
  })
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
 * 计算每个习惯的历史最高连续打卡天数（最佳连续天数）。
 * 遍历所有历史打卡记录，找出最长连续日期段。
 * @returns 以 habit_id 为键、最佳连续天数为值的映射
 */
export async function getBestStreaks(): Promise<Record<string, number>> {
  const db = getClient()
  const rows = (await db.execute(
    `SELECT habit_id, date FROM habit_completions WHERE completed = 1 ORDER BY habit_id, date ASC`
  )).rows

  const bestStreaks: Record<string, number> = {}

  // Group by habit_id
  const byHabit: Record<string, string[]> = {}
  for (const row of rows) {
    const hid = row.habit_id as string
    if (!byHabit[hid]) byHabit[hid] = []
    byHabit[hid].push(row.date as string)
  }

  for (const [hid, dates] of Object.entries(byHabit)) {
    if (dates.length === 0) { bestStreaks[hid] = 0; continue }

    // Remove duplicates and sort
    const uniqueDates = Array.from(new Set(dates)).sort()

    let best = 1
    let current = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1])
      const curr = new Date(uniqueDates[i])
      const diffMs = curr.getTime() - prev.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        current++
        best = Math.max(best, current)
      } else {
        current = 1
      }
    }
    bestStreaks[hid] = best
  }
  return bestStreaks
}

/**
 * 获取本周的打卡统计（周一开始）。
 * @returns 本周完成次数和完成率
 */
export async function getWeeklyStats(): Promise<{ weekCompletions: number; weeklyRate: number }> {
  const db = getClient()

  // Get start of current week (Monday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const mondayStr = monday.toISOString().slice(0, 10)

  const weekResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM habit_completions WHERE completed=1 AND date >= ?`,
    args: [mondayStr],
  })
  const weekCompletions = (weekResult.rows[0]?.count as number) || 0

  // Calculate max possible: daily habits * 7 + weekly habits * 1
  const allHabits = await getHabits()
  const dailyCount = allHabits.filter(h => h.frequency === 'daily').length
  const weeklyCount = allHabits.filter(h => h.frequency === 'weekly').length
  const maxWeekly = dailyCount * 7 + weeklyCount
  const weeklyRate = maxWeekly > 0 ? Math.round((weekCompletions / maxWeekly) * 100) : 0

  return { weekCompletions, weeklyRate }
}

/**
 * 获取每个习惯的坚持天数（从创建日到现在的天数）。
 * @returns 以 habit_id 为键、坚持天数为值的映射
 */
export async function getHabitAges(): Promise<Record<string, number>> {
  const habits = await getHabits()
  const now = new Date()
  const ages: Record<string, number> = {}
  for (const habit of habits) {
    const created = new Date(habit.createdAt)
    const diffMs = now.getTime() - created.getTime()
    ages[habit.id] = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  }
  return ages
}

/**
 * 获取本月的打卡统计，按每个习惯单独计算完成率后取平均值。
 * @returns 本月完成次数、平均完成率、逐习惯完成率
 */
export async function getMonthlyStats(): Promise<{ monthCompletions: number; monthlyRate: number; perHabitRates: Record<string, number> }> {
  const db = getClient()
  const habits = await getHabits()

  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartStr = monthStart.toISOString().slice(0, 10)

  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0
  ).getDate()

  // Get all completions this month grouped by habit
  const result = await db.execute({
    sql: `SELECT habit_id, COUNT(*) as count FROM habit_completions WHERE completed=1 AND date >= ? GROUP BY habit_id`,
    args: [monthStartStr],
  })

  const perHabitRates: Record<string, number> = {}
  let totalCompletions = 0

  for (const row of result.rows) {
    const hid = row.habit_id as string
    const count = row.count as number
    totalCompletions += count
    const habit = habits.find(h => h.id === hid)
    if (habit) {
      const maxDays = habit.frequency === 'daily' ? daysInMonth : Math.ceil(daysInMonth / 7)
      perHabitRates[hid] = maxDays > 0 ? Math.round((count / maxDays) * 100) : 0
    }
  }

  // Average per-habit rate (more accurate than the old mixed calculation)
  const habitsWithRates = habits.filter(h => perHabitRates[h.id] !== undefined)
  const monthlyRate = habitsWithRates.length > 0
    ? Math.round(habitsWithRates.reduce((sum, h) => sum + (perHabitRates[h.id] || 0), 0) / habitsWithRates.length)
    : 0

  return { monthCompletions: totalCompletions, monthlyRate, perHabitRates }
}


