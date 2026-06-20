import { NextRequest, NextResponse } from 'next/server'
import { createHabit, getHabits, deleteHabit, toggleCompletion, getTodayCompletions, getStreaks, initDB } from '@/lib/db'
import type { Habit } from '@/lib/types'

export async function GET() {
  await initDB()
  const habits = await getHabits()
  const todayCompletions = await getTodayCompletions()
  const streaks = await getStreaks()
  return NextResponse.json({ habits, todayCompletions, streaks })
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
