import { NextRequest, NextResponse } from 'next/server'
import { createNote, upsertBudget } from '@/lib/db'
import type { Note } from '@/lib/types'

export async function POST(req: NextRequest) {
  let body: { notes?: unknown[]; budgets?: unknown[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '无效的 JSON 格式' }, { status: 400 })
  }

  const { notes, budgets } = body
  let imported = 0

  if (Array.isArray(notes)) {
    for (const item of notes) {
      const n = item as Record<string, unknown>
      const note: Note = {
        id: (n.id as string) || crypto.randomUUID(),
        content: (n.content as string) || '',
        title: (n.title as string) || null,
        type: (n.type as Note['type']) || 'note',
        tags: (n.tags as string[]) || [],
        dueDate: (n.dueDate as string) || (n.due_date as string) || null,
        done: (n.done as boolean) || false,
        pinned: (n.pinned as boolean) || false,
        createdAt: (n.createdAt as string) || (n.created_at as string) || new Date().toISOString(),
        updatedAt: (n.updatedAt as string) || (n.updated_at as string) || new Date().toISOString(),
      }
      await createNote(note)
      imported++
    }
  }

  if (Array.isArray(budgets)) {
    for (const item of budgets) {
      const b = item as Record<string, unknown>
      await upsertBudget(b.month as string, {
        fixedBudget: (b.fixedBudget as number) ?? (b.fixed_budget as number) ?? 0,
        variableBudget: (b.variableBudget as number) ?? (b.variable_budget as number) ?? 0,
        fixedActual: (b.fixedActual as number) ?? (b.fixed_actual as number) ?? null,
        variableActual: (b.variableActual as number) ?? (b.variable_actual as number) ?? null,
        notes: (b.notes as string) ?? '',
        isCompleted: (b.isCompleted as boolean) ?? (b.is_completed as boolean) ?? false,
        savingsCompleted: (b.savingsCompleted as boolean) ?? (b.savings_completed as boolean) ?? false,
      })
      imported++
    }
  }

  return NextResponse.json({ success: true, imported })
}
