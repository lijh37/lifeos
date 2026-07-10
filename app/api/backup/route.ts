import { NextRequest, NextResponse } from 'next/server'
import { getNotes, getBudgets, getHabits, createNote, upsertBudget } from '@/lib/db'
import { getClient } from '@/lib/db/client'

export async function GET() {
  const [notes, budgets, habits] = await Promise.all([
    getNotes(undefined, 10000),
    getBudgets(),
    getHabits(),
  ])

  const db = getClient()
  const habitCompletions = (await db.execute(
    'SELECT id, habit_id, date, completed, created_at FROM habit_completions'
  )).rows.map(r => ({
    id: r.id as string,
    habit_id: r.habit_id as string,
    date: r.date as string,
    completed: (r.completed as number) === 1,
    created_at: r.created_at as string,
  }))

  const data = {
    exportedAt: new Date().toISOString(),
    version: '1',
    notes,
    budgets,
    habits,
    habitCompletions,
  }

  const filename = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function POST(req: NextRequest) {
  let data: Record<string, unknown>
  try {
    data = await req.json()
  } catch {
    return NextResponse.json({ error: '无效的 JSON 格式' }, { status: 400 })
  }

  if (!data.version || !Array.isArray(data.notes)) {
    return NextResponse.json({ error: '无效的备份文件' }, { status: 400 })
  }

  const db = getClient()

  // Clear existing data in FK-safe order
  await db.execute('DELETE FROM habit_completions')
  await db.execute('DELETE FROM habits')
  await db.execute('DELETE FROM note_tags')
  await db.execute('DELETE FROM tags')
  await db.execute('DELETE FROM budgets')
  await db.execute('DELETE FROM notes')

  let imported = 0

  // Import notes (use createNote for tag syncing)
  for (const n of data.notes as any[]) {
    await createNote({
      id: n.id,
      content: n.content ?? '',
      title: n.title ?? null,
      type: n.type ?? 'note',
      tags: n.tags ?? [],
      dueDate: n.dueDate ?? n.due_date ?? null,
      done: n.done ?? false,
      pinned: n.pinned ?? false,
      createdAt: n.createdAt ?? n.created_at ?? new Date().toISOString(),
      updatedAt: n.updatedAt ?? n.updated_at ?? new Date().toISOString(),
    })
    imported++
  }

  // Import budgets
  if (Array.isArray(data.budgets)) {
    for (const b of data.budgets as any[]) {
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

  // Import habits
  if (Array.isArray(data.habits)) {
    for (const h of data.habits as any[]) {
      await db.execute({
        sql: 'INSERT INTO habits (id, name, description, frequency, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [h.id, h.name, h.description || '', h.frequency || 'daily', h.createdAt || h.created_at || new Date().toISOString()],
      })
      imported++
    }
  }

  // Import habit completions
  if (Array.isArray(data.habitCompletions)) {
    for (const hc of data.habitCompletions as any[]) {
      await db.execute({
        sql: 'INSERT INTO habit_completions (id, habit_id, date, completed, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [
          hc.id,
          hc.habit_id,
          hc.date,
          hc.completed ? 1 : 0,
          hc.created_at || new Date().toISOString(),
        ],
      })
      imported++
    }
  }

  return NextResponse.json({ success: true, imported })
}
