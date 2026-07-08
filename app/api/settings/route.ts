import { NextRequest, NextResponse } from 'next/server'
import { getNotesCount, getBudgetsCount, getHabitsCount, clearTable } from '@/lib/db'

export async function GET() {
  const [notes, budgets, habits] = await Promise.all([
    getNotesCount(),
    getBudgetsCount(),
    getHabitsCount(),
  ])
  return NextResponse.json({
    notes: notes.note,
    notesDetail: notes,
    budgets,
    habits,
  })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  const clearAll = async () => {
    await clearTable('habit_completions')
    await clearTable('habits')
    await clearTable('budgets')
    await clearTable('notes')
    await clearTable('chat_messages')
  }

  switch (type) {
    case 'notes':
      await clearTable('notes')
      break
    case 'budgets':
      await clearTable('budgets')
      break
    case 'habits':
      await clearTable('habit_completions')
      await clearTable('habits')
      break
    case 'all':
      await clearAll()
      break
    default:
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
