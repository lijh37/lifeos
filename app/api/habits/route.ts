import { NextRequest, NextResponse } from 'next/server'
import {
  createHabit, deleteHabit, updateHabit,
  getHabitsDashboard, toggleCompletion,
} from '@/lib/db'
import type { Habit } from '@/lib/types'

export async function GET() {
  const dashboard = await getHabitsDashboard()
  return NextResponse.json(dashboard, { headers: { 'Cache-Control': 'private, max-age=20, stale-while-revalidate=90' } })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (body._action === 'toggle') {
    // Toggle completion state via shared DB helper
    const completed = await toggleCompletion(body.habitId, body.date)

    // Reuse the dashboard query to compute per-habit stats (streak, bestStreak,
    // weekCount, monthCount, totalCompletions) for the toggled habit.
    const dashboard = await getHabitsDashboard()
    const id = body.habitId
    const streak = dashboard.streaks[id] ?? 0
    const bestStreak = dashboard.bestStreaks[id] ?? 0
    const weekCount = dashboard.perHabitWeek[id] ?? 0
    const monthCount = dashboard.perHabitMonth[id] ?? 0
    const totalCompletions = dashboard.perHabitTotals[id] ?? 0

    return NextResponse.json({
      completed,
      streak,
      bestStreak,
      weekCount,
      monthCount,
      totalCompletions,
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
