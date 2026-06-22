import { NextRequest, NextResponse } from 'next/server'
import { initDB, createNote, upsertBudget } from '@/lib/db'
import type { Note } from '@/lib/types'

export async function POST(req: NextRequest) {
  await initDB()
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '无效的 JSON 格式' }, { status: 400 })
  }

  const { notes, budgets } = body
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

  if (Array.isArray(budgets)) {
    for (const b of budgets) {
      await upsertBudget(b.month, {
        fixedBudget: b.fixedBudget ?? b.fixed_budget ?? 0,
        variableBudget: b.variableBudget ?? b.variable_budget ?? 0,
        fixedActual: b.fixedActual ?? b.fixed_actual ?? null,
        variableActual: b.variableActual ?? b.variable_actual ?? null,
        notes: b.notes ?? '',
        isCompleted: b.isCompleted ?? b.is_completed ?? false,
        savingsCompleted: b.savingsCompleted ?? b.savings_completed ?? false,
      })
      imported++
    }
  }

  return NextResponse.json({ success: true, imported })
}
