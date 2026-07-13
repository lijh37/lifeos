import { NextRequest, NextResponse } from 'next/server'
import {
  createHabit, getHabits, deleteHabit, updateHabit, toggleCompletion,
  getTodayCompletions, getStreaks, getBestStreaks,
  getMonthlyStats, getClient,
} from '@/lib/db'
import type { Habit } from '@/lib/types'

export async function GET() {
  const db = getClient()
  const habits = await getHabits()
  const todayCompletions = await getTodayCompletions()
  const streaks = await getStreaks()
  const bestStreaks = await getBestStreaks()
  const monthlyStats = await getMonthlyStats()

  // Per-habit total completions
  const perHabitTotalsRows = await db.execute(`SELECT habit_id, COUNT(*) as count FROM habit_completions WHERE completed=1 GROUP BY habit_id`)
  const perHabitTotals: Record<string, number> = {}
  perHabitTotalsRows.rows.forEach(r => {
    perHabitTotals[r.habit_id as string] = r.count as number
  })

  // Per-habit weekly completions (Monday this week onward)
  const weekStart = new Date()
  const dayOfWeek = weekStart.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(weekStart)
  monday.setDate(weekStart.getDate() + mondayOffset)
  const mondayStr = monday.toISOString().slice(0, 10)

  const perHabitWeekRows = await db.execute({
    sql: `SELECT habit_id, COUNT(*) as count FROM habit_completions WHERE completed=1 AND date >= ? GROUP BY habit_id`,
    args: [mondayStr],
  })
  const perHabitWeek: Record<string, number> = {}
  perHabitWeekRows.rows.forEach(r => {
    perHabitWeek[r.habit_id as string] = r.count as number
  })

  // Per-habit monthly completions (month start onward)
  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartStr = monthStart.toISOString().slice(0, 10)

  const perHabitMonthRows = await db.execute({
    sql: `SELECT habit_id, COUNT(*) as count FROM habit_completions WHERE completed=1 AND date >= ? GROUP BY habit_id`,
    args: [monthStartStr],
  })
  const perHabitMonth: Record<string, number> = {}
  perHabitMonthRows.rows.forEach(r => {
    perHabitMonth[r.habit_id as string] = r.count as number
  })

  return NextResponse.json({
    habits,
    todayCompletions,
    streaks,
    bestStreaks,
    perHabitRates: monthlyStats.perHabitRates,
    perHabitTotals,
    perHabitWeek,
    perHabitMonth,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (body._action === 'toggle') {
    const completed = await toggleCompletion(body.habitId, body.date)
    const db = getClient()
    const streaks = await getStreaks()
    const bestStreaks = await getBestStreaks()

    // Per-habit total completions
    const totalResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM habit_completions WHERE habit_id = ? AND completed=1',
      args: [body.habitId],
    })
    const totalCompletions = (totalResult.rows[0]?.count as number) || 0

    // Per-habit weekly completions
    const weekStart = new Date()
    const dayOfWeek = weekStart.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(weekStart)
    monday.setDate(weekStart.getDate() + mondayOffset)
    const mondayStr = monday.toISOString().slice(0, 10)

    const weekResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM habit_completions WHERE habit_id = ? AND completed=1 AND date >= ?',
      args: [body.habitId, mondayStr],
    })
    const weekCount = (weekResult.rows[0]?.count as number) || 0

    // Per-habit monthly completions
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartStr = monthStart.toISOString().slice(0, 10)

    const monthResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM habit_completions WHERE habit_id = ? AND completed=1 AND date >= ?',
      args: [body.habitId, monthStartStr],
    })
    const monthCount = (monthResult.rows[0]?.count as number) || 0

    return NextResponse.json({
      completed,
      streak: streaks[body.habitId] ?? 0,
      bestStreak: bestStreaks[body.habitId] ?? 0,
      weekCount,
      monthCount,
      totalCompletions,
    })
  }
  const habit: Habit = {
    id: crypto.randomUUID(),
    name: body.name,
    description: body.description || '',
    frequency: body.frequency || 'daily',
    createdAt: new Date().toISOString(),
  }
  await createHabit(habit)
  return NextResponse.json({ habit })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, name, description } = body
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: 'Missing id or name' }, { status: 400 })
  }
  await updateHabit(id, name.trim(), description || '')
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteHabit(id)
  return NextResponse.json({ success: true })
}
