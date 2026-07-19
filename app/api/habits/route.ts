import { NextRequest, NextResponse } from 'next/server'
import {
  createHabit, deleteHabit, updateHabit,
  getHabitsDashboard, getClient,
  computeCurrentStreak, computeBestStreak,
} from '@/lib/db'
import type { Habit } from '@/lib/types'
import { genId } from '@/lib/utils'
import { isAuthorized } from '@/lib/auth-guard'

export async function GET() {
  const dashboard = await getHabitsDashboard()
  return NextResponse.json(dashboard, { headers: { 'Cache-Control': 'private, max-age=20, stale-while-revalidate=90' } })
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  if (body._action === 'toggle') {
    const db = getClient()

    // 1. Toggle completion state (inline toggleCompletion)
    const existing = await db.execute({
      sql: 'SELECT id, completed FROM habit_completions WHERE habit_id = ? AND date = ?',
      args: [body.habitId, body.date],
    })
    let completed: boolean
    if (existing.rows.length > 0) {
      const row = existing.rows[0]
      const newCompleted = (row.completed as number) === 0 ? 1 : 0
      await db.execute({
        sql: 'UPDATE habit_completions SET completed = ? WHERE id = ?',
        args: [newCompleted, row.id],
      })
      completed = newCompleted === 1
    } else {
      await db.execute({
        sql: 'INSERT INTO habit_completions (id, habit_id, date, completed, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [genId(), body.habitId, body.date, 1, new Date().toISOString()],
      })
      completed = true
    }

    // 2. Single combined query: dates + stats via window functions
    //    Replaces 3 separate queries (streak, bestStreak, counts)
    const weekStart = new Date()
    const dayOfWeek = weekStart.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(weekStart)
    monday.setDate(weekStart.getDate() + mondayOffset)
    const mondayStr = monday.toISOString().slice(0, 10)

    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartStr = monthStart.toISOString().slice(0, 10)

    const combinedResult = await db.execute({
      sql: `SELECT 
        date,
        COUNT(*) OVER () as total,
        SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) OVER () as week_count,
        SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) OVER () as month_count
      FROM habit_completions 
      WHERE habit_id = ? AND completed = 1 
      ORDER BY date DESC`,
      args: [mondayStr, monthStartStr, body.habitId],
    })

    const dates = combinedResult.rows.map(r => r.date as string)
    const total = (combinedResult.rows[0]?.total as number) || 0
    const weekCount = (combinedResult.rows[0]?.week_count as number) || 0
    const monthCount = (combinedResult.rows[0]?.month_count as number) || 0

    // 3. Calculate current streak from dates (Set for O(1) lookup)
    const datesSet = new Set(dates)
    const streak = computeCurrentStreak(datesSet)
    const sortedDates = [...dates].sort()
    const bestStreak = computeBestStreak(sortedDates)

    return NextResponse.json({
      completed,
      streak,
      bestStreak,
      weekCount,
      monthCount,
      totalCompletions: total,
    })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  const frequency = body.frequency === 'weekly' ? 'weekly' : 'daily'
  const habit: Habit = {
    id: crypto.randomUUID(),
    name,
    description: typeof body.description === 'string' ? body.description : '',
    frequency,
    createdAt: new Date().toISOString(),
  }
  await createHabit(habit)
  return NextResponse.json({ habit })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { id, name, description } = body
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: 'Missing id or name' }, { status: 400 })
  }
  await updateHabit(id, name.trim(), description || '')
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteHabit(id)
  return NextResponse.json({ success: true })
}
