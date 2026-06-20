import { NextRequest, NextResponse } from 'next/server'
import { initDB, createNote, createExpense } from '@/lib/db'
import type { Note, Expense } from '@/lib/types'

export async function POST(req: NextRequest) {
  await initDB()
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '无效的 JSON 格式' }, { status: 400 })
  }

  const { notes, expenses } = body
  let imported = 0

  if (Array.isArray(notes)) {
    for (const n of notes) {
      const note: Note = {
        id: n.id || crypto.randomUUID(),
        content: n.content || '',
        title: n.title || null,
        type: n.type || 'note',
        tags: n.tags || [],
        dueDate: n.dueDate || n.due_date || null,
        done: n.done || false,
        createdAt: n.createdAt || n.created_at || new Date().toISOString(),
        updatedAt: n.updatedAt || n.updated_at || new Date().toISOString(),
      }
      await createNote(note)
      imported++
    }
  }

  if (Array.isArray(expenses)) {
    for (const e of expenses) {
      const expense: Expense = {
        id: e.id || crypto.randomUUID(),
        amount: e.amount || 0,
        category: e.category || '其他',
        description: e.description || '',
        type: e.type || 'expense',
        createdAt: e.createdAt || e.created_at || new Date().toISOString(),
      }
      await createExpense(expense)
      imported++
    }
  }

  return NextResponse.json({ success: true, imported })
}
