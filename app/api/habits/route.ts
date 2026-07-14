import { NextRequest, NextResponse } from 'next/server'
import {
  createHabit, deleteHabit, updateHabit, toggleCompletion,
  getHabitsDashboard, getClient,
} from '@/lib/db'
import type { Habit } from '@/lib/types'

export async function GET() {
  const dashboard = await getHabitsDashboard()
  return NextResponse.json(dashboard)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (body._action === 'toggle') {
    const completed = await toggleCompletion(body.habitId, body.date)
    const db = getClient()

    // Get completion dates for this specific habit only — O(streak_length) per habit
    const streakRows = await db.execute({
      sql: 'SELECT date FROM habit_completions WHERE habit_id = ? AND completed = 1 ORDER BY date DESC',
      args: [body.habitId],
    })

    // Calculate current streak for this habit
    const dates = new Set(streakRows.rows.map(r => r.date as string))
    const today = new Date()
    let streak = 0
    const cursor = new Date(today)
    for (let j = 0; j < 365; j++) {
      const dateStr = cursor.toISOString().slice(0, 10)
      if (dates.has(dateStr)) streak++
      else if (j > 0) break
      cursor.setDate(cursor.getDate() - 1)
    }

    // Calculate best streak for this habit
    const bestStreakRows = await db.execute({
      sql: 'SELECT date FROM habit_completions WHERE habit_id = ? AND completed = 1 ORDER BY date ASC',
      args: [body.habitId],
    })
    const bestDates = Array.from(new Set(bestStreakRows.rows.map(r => r.date as string))).sort()
    let best = bestDates.length > 0 ? 1 : 0
    let current = 1
    for (let i = 1; i < bestDates.length; i++) {
      const diffDays = Math.round((new Date(bestDates[i]).getTime() - new Date(bestDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) { current++; best = Math.max(best, current) }
      else { current = 1 }
    }

    // Merged query for total/week/month counts for this habit
    const weekStart = new Date()
    const dayOfWeek = weekStart.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(weekStart)
    monday.setDate(weekStart.getDate() + mondayOffset)
    const mondayStr = monday.toISOString().slice(0, 10)

    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartStr = monthStart.toISOString().slice(0, 10)

    const countResult = await db.execute({
      sql: `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) as week_count,
        SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) as month_count
      FROM habit_completions WHERE habit_id = ? AND completed = 1`,
      args: [mondayStr, monthStartStr, body.habitId],
    })

    return NextResponse.json({
      completed,
      streak,
      bestStreak: best,
      weekCount: (countResult.rows[0]?.week_count as number) || 0,
      monthCount: (countResult.rows[0]?.month_count as number) || 0,
      totalCompletions: (countResult.rows[0]?.total as number) || 0,
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
