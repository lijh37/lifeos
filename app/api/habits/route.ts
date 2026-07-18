import { NextRequest, NextResponse } from 'next/server'
import {
  createHabit, deleteHabit, updateHabit,
  getHabitsDashboard, getClient,
} from '@/lib/db'
import type { Habit } from '@/lib/types'
import { genId } from '@/lib/utils'

export async function GET() {
  const dashboard = await getHabitsDashboard()
  return NextResponse.json(dashboard, { headers: { 'Cache-Control': 'public, max-age=20, stale-while-revalidate=90' } })
}

export async function POST(req: NextRequest) {
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
    let streak = 0
    const today = new Date()
    const cursor = new Date(today)
    for (let j = 0; j < 365; j++) {
      const dateStr = cursor.toISOString().slice(0, 10)
      if (datesSet.has(dateStr)) streak++
      else if (j > 0) break
      cursor.setDate(cursor.getDate() - 1)
    }

    // 4. Calculate best streak from sorted dates
    const sortedDates = [...dates].sort()
    let best = sortedDates.length > 0 ? 1 : 0
    let current = 1
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.round(
        (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      if (diff === 1) { current++; best = Math.max(best, current) }
      else { current = 1 }
    }

    return NextResponse.json({
      completed,
      streak,
      bestStreak: best,
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
