import { NextRequest, NextResponse } from 'next/server'
import { createHabit, getHabits, deleteHabit, toggleCompletion, getTodayCompletions, getStreaks, initDB, getClient } from '@/lib/db'
import type { Habit } from '@/lib/types'

export async function GET() {
  await initDB()
  const db = getClient()
  const habits = await getHabits()
  const todayCompletions = await getTodayCompletions()
  const streaks = await getStreaks()

  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartStr = monthStart.toISOString().slice(0, 10)

  const [monthlyStats, trend7d, totalCount] = await Promise.all([
    db.execute({
      sql: `SELECT date, COUNT(*) as count FROM habit_completions WHERE completed=1 AND date >= ? GROUP BY date ORDER BY date ASC`,
      args: [monthStartStr],
    }),
    db.execute({
      sql: `SELECT date, COUNT(*) as count FROM habit_completions WHERE completed=1 AND date >= date('now', '-7 days') GROUP BY date ORDER BY date ASC`,
    }),
    db.execute(`SELECT COUNT(*) as count FROM habit_completions WHERE completed=1`),
  ])

  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0
  ).getDate()

  const monthCompletions = monthlyStats.rows.reduce((sum, r) => sum + (r.count as number), 0)
  const totalHabits = habits.length
  const maxDaily = totalHabits * daysInMonth
  const monthlyRate = maxDaily > 0 ? Math.round((monthCompletions / maxDaily) * 100) : 0

  return NextResponse.json({
    habits,
    todayCompletions,
    streaks,
    stats: {
      monthlyRate,
      monthCompletions,
      totalCompletions: (totalCount.rows[0]?.count as number) || 0,
      trend7d: trend7d.rows.map(r => ({
        date: r.date as string,
        count: r.count as number,
      })),
    },
  })
}

export async function POST(req: NextRequest) {
  await initDB()
  const body = await req.json()
  if (body._action === 'toggle') {
    const completed = await toggleCompletion(body.habitId, body.date)
    return NextResponse.json({ completed })
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

export async function DELETE(req: NextRequest) {
  await initDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteHabit(id)
  return NextResponse.json({ success: true })
}
