import type { Habit } from '../types'
import { getClient } from './client'
import { genId, localDateStr } from '../utils'

/**
 * 宽容式（never miss twice）streak 扫描核心：从第一个完成日逐日扫描到锚点日（含）。
 *
 * 语义：段内允许 1 个漏记日（run 不变、段不断），连续 2 个漏记日才断（run 归零）。
 * 锚点日（今天/from）未打卡不判漏——当天还没过完。
 *
 * 起止都是真实日期，逐日步进天然有界，无上限；空集直接返回 0。
 *
 * @param datesSet 已完成日期的 Set（YYYY-MM-DD）
 * @param anchor 锚点日（扫描终点，含）
 * @returns 扫描结束时的 run 与全程 best
 */
function scanGraceRuns(datesSet: Set<string>, anchor: Date): { run: number; best: number } {
  const sorted = Array.from(datesSet).sort()
  if (sorted.length === 0) return { run: 0, best: 0 }

  const anchorStr = localDateStr(anchor)
  // 本地时区解析起始日，避免 new Date('YYYY-MM-DD') 的 UTC 午夜在负时区错位一天
  const [fy, fm, fd] = sorted[0].split('-').map(Number)
  const cursor = new Date(fy, fm - 1, fd)

  let run = 0
  let missedInRow = 0
  let best = 0

  while (localDateStr(cursor) <= anchorStr) {
    const dateStr = localDateStr(cursor)
    if (datesSet.has(dateStr)) {
      run++
      missedInRow = 0
      if (run > best) best = run
    } else if (dateStr !== anchorStr) {
      // 非锚点日的漏记才判；锚点日（今天）未打不判漏
      missedInRow++
      if (missedInRow >= 2) run = 0
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return { run, best }
}

/**
 * 计算当前连续打卡天数（宽容式：段内允许 1 个漏记日，连续 2 个漏记才断）。
 * @param datesSet 已完成日期的 Set（YYYY-MM-DD）
 * @param from 锚点日（默认今天；未打卡不判漏）
 */
export function computeCurrentStreak(datesSet: Set<string>, from: Date = new Date()): number {
  return scanGraceRuns(datesSet, from).run
}

/**
 * 计算历史最长连续打卡天数（宽容式：段内允许 1 个漏记日，连续 2 个漏记才断）。
 * @param sortedDates 升序排列的去重日期数组（YYYY-MM-DD）
 */
export function computeBestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0
  const last = sortedDates[sortedDates.length - 1]
  const [ly, lm, ld] = last.split('-').map(Number)
  return scanGraceRuns(new Set(sortedDates), new Date(ly, lm - 1, ld)).best
}

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
  const tx = await db.transaction()
  try {
    await tx.execute({ sql: 'DELETE FROM habits WHERE id = ?', args: [id] })
    await tx.execute({ sql: 'DELETE FROM habit_completions WHERE habit_id = ?', args: [id] })
    await tx.commit()
  } catch (e) {
    await tx.rollback()
    throw e
  }
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
    if (newCompleted === 1) {
      // 0→1（补回打卡）时刷新 created_at：recentDays 的 isBackfilled 用
      // created_at > date 派生，若沿用旧 created_at，"打过卡→取消→再补回"
      // 的补记会在刷新后丢失诚实标记。1→0 保持原值（历史创建时间）。
      await db.execute({
        sql: 'UPDATE habit_completions SET completed = ?, created_at = ? WHERE id = ?',
        args: [1, new Date().toISOString(), row.id],
      })
    } else {
      await db.execute({
        sql: 'UPDATE habit_completions SET completed = ? WHERE id = ?',
        args: [0, row.id],
      })
    }
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
 * 获取所有习惯在今天（按本地日期）的打卡状态。
 * @returns 以 habit_id 为键、完成状态为值的映射
 */
export async function getTodayCompletions(): Promise<Record<string, boolean>> {
  const today = localDateStr()
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
 * 获取本周周一日期（YYYY-MM-DD）。
 */
export function getWeekStart(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  return localDateStr(monday)
}

/**
 * 获取本月第一天日期（YYYY-MM-DD）。
 */
export function getMonthStart(): string {
  const monthStart = new Date()
  monthStart.setDate(1)
  return localDateStr(monthStart)
}

/**
 * 一次性获取仪表盘所需的所有数据，相比独立调用各函数显著减少数据库查询次数。
 *
 * 执行 4 次查询（原方案 8 次）：
 *   1. 查询所有习惯
 *   2. 查询今日打卡状态
 *   3. 加载所有完成记录（用于 streak + bestStreak）
 *   4. 单次 GROUP BY 查询（合并 total/week/month 统计 + perHabitRates）
 *
 * @returns 合并后的仪表盘数据结构
 */
export async function getHabitsDashboard(): Promise<{
  habits: Habit[],
  todayCompletions: Record<string, boolean>,
  streaks: Record<string, number>,
  bestStreaks: Record<string, number>,
  perHabitRates: Record<string, number>,
  perHabitTotals: Record<string, number>,
  perHabitWeek: Record<string, number>,
  perHabitMonth: Record<string, number>,
  recentDays: Record<string, { date: string; completed: boolean; isBackfilled: boolean }[]>,
}> {
  const db = getClient()

  // 1. 查询所有习惯
  const habits = await getHabits()

  // 2. 查询今日打卡状态
  const todayCompletions = await getTodayCompletions()

  // 3. 一次加载所有完成记录，用于 streak + bestStreak + recentDays（created_at 用于补记判定）
  const allRows = (await db.execute(
    `SELECT habit_id, date, created_at FROM habit_completions WHERE completed = 1 ORDER BY habit_id, date DESC`
  )).rows

  // 按 habit_id 分组为 Set（O(1) 查找）和数组（排序去重）
  const byHabitSet: Record<string, Set<string>> = {}
  const byHabitArray: Record<string, string[]> = {}
  // (habit_id, date) → created_at，用于 recentDays 的 isBackfilled 判定
  const createdByHabitDate: Record<string, Record<string, string>> = {}
  for (const row of allRows) {
    const hid = row.habit_id as string
    if (!byHabitSet[hid]) byHabitSet[hid] = new Set()
    byHabitSet[hid].add(row.date as string)
    if (!byHabitArray[hid]) byHabitArray[hid] = []
    byHabitArray[hid].push(row.date as string)
    if (!createdByHabitDate[hid]) createdByHabitDate[hid] = {}
    createdByHabitDate[hid][row.date as string] = row.created_at as string
  }

  // 3a. 计算当前 streak（Set 向后遍历）
  const streaks: Record<string, number> = {}
  for (const [hid, dates] of Object.entries(byHabitSet)) {
    streaks[hid] = computeCurrentStreak(dates)
  }

  // 3b. 计算最佳 streak
  const bestStreaks: Record<string, number> = {}
  for (const [hid, dates] of Object.entries(byHabitArray)) {
    bestStreaks[hid] = computeBestStreak(Array.from(new Set(dates)).sort())
  }

  // 3c. 每个习惯（含无打卡的）最近 3 个本地日期（今天、昨天、前天，新的在前）
  const recentDays: Record<string, { date: string; completed: boolean; isBackfilled: boolean }[]> = {}
  for (const habit of habits) {
    const days: { date: string; completed: boolean; isBackfilled: boolean }[] = []
    for (let offset = 0; offset < 3; offset++) {
      const d = new Date()
      d.setDate(d.getDate() - offset)
      const dateStr = localDateStr(d)
      const completed = byHabitSet[habit.id]?.has(dateStr) ?? false
      const createdAt = createdByHabitDate[habit.id]?.[dateStr]
      days.push({
        date: dateStr,
        completed,
        isBackfilled: completed && createdAt !== undefined && localDateStr(new Date(createdAt)) > dateStr,
      })
    }
    recentDays[habit.id] = days
  }

  // 4. 单次 GROUP BY 查询：合并 total/week/month → perHabitTotals / perHabitWeek / perHabitMonth / perHabitRates
  const weekStart = getWeekStart()
  const monthStart = getMonthStart()
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate()

  const countResult = await db.execute({
    sql: `SELECT 
      habit_id,
      COUNT(*) as total,
      SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) as week_count,
      SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) as month_count
    FROM habit_completions WHERE completed = 1 GROUP BY habit_id`,
    args: [weekStart, monthStart],
  })

  const perHabitTotals: Record<string, number> = {}
  const perHabitWeek: Record<string, number> = {}
  const perHabitMonth: Record<string, number> = {}
  const perHabitRates: Record<string, number> = {}

  for (const row of countResult.rows) {
    const hid = row.habit_id as string
    const total = (row.total as number) || 0
    const week = (row.week_count as number) || 0
    const month = (row.month_count as number) || 0

    perHabitTotals[hid] = total
    perHabitWeek[hid] = week
    perHabitMonth[hid] = month

    const habit = habits.find(h => h.id === hid)
    if (habit) {
      const maxDays = habit.frequency === 'daily' ? daysInMonth : Math.ceil(daysInMonth / 7)
      perHabitRates[hid] = maxDays > 0 ? Math.round((month / maxDays) * 100) : 0
    }
  }

  return {
    habits,
    todayCompletions,
    streaks,
    bestStreaks,
    perHabitRates,
    perHabitTotals,
    perHabitWeek,
    perHabitMonth,
    recentDays,
  }
}
