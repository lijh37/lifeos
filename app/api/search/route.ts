import { NextRequest, NextResponse } from 'next/server'
import { searchNotes, searchExpenses, searchHabits, initDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ notes: [], expenses: [], habits: [] })
  }

  await initDB()
  const [notes, expenses, habits] = await Promise.all([
    searchNotes(q.trim()),
    searchExpenses(q.trim()),
    searchHabits(q.trim()),
  ])

  return NextResponse.json({ notes, expenses, habits })
}
