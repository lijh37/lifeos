import { NextRequest, NextResponse } from 'next/server'
import { getNotes, getBudgets, getHabits } from '@/lib/db'
import { getClient } from '@/lib/db/client'
import { isAuthorized } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [notes, budgets, habits] = await Promise.all([
    getNotes(undefined, Number.MAX_SAFE_INTEGER),
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
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
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

  const tx = await db.transaction()
  try {
    // Clear existing data in FK-safe order
    await tx.execute('DELETE FROM attachments')
    await tx.execute('DELETE FROM habit_completions')
    await tx.execute('DELETE FROM habits')
    await tx.execute('DELETE FROM note_tags')
    await tx.execute('DELETE FROM tags')
    await tx.execute('DELETE FROM budgets')
    await tx.execute('DELETE FROM notes')

    let imported = 0

    // Import notes (raw INSERT to avoid FTS5 trigger issues inside tx)
    for (const n of data.notes as any[]) {
      await tx.execute({
        sql: `INSERT INTO notes (id, content, title, type, due_date, done, pinned, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          n.id,
          n.content ?? '',
          n.title ?? null,
          n.type ?? 'note',
          n.dueDate ?? n.due_date ?? null,
          n.done ? 1 : 0,
          n.pinned ? 1 : 0,
          n.createdAt ?? n.created_at ?? new Date().toISOString(),
          n.updatedAt ?? n.updated_at ?? new Date().toISOString(),
        ],
      })
      // Re-sync tags
      const tags = (n.tags ?? []) as string[]
      for (const tagName of tags) {
        if (!tagName.trim()) continue
        const existing = await tx.execute({ sql: 'SELECT id FROM tags WHERE name = ?', args: [tagName.trim()] })
        let tagId: string
        if (existing.rows.length > 0) {
          tagId = existing.rows[0].id as string
        } else {
          tagId = crypto.randomUUID()
          await tx.execute({
            sql: 'INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)',
            args: [tagId, tagName.trim(), new Date().toISOString()],
          })
        }
        await tx.execute({
          sql: 'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
          args: [n.id, tagId],
        })
      }
      imported++
    }

    // Import budgets
    if (Array.isArray(data.budgets)) {
      for (const b of data.budgets as any[]) {
        const month = b.month
        const existing = await tx.execute({ sql: 'SELECT id FROM budgets WHERE month = ?', args: [month] })
        const now = new Date().toISOString()
        if (existing.rows.length > 0) {
          await tx.execute({
            sql: `UPDATE budgets SET fixed_budget=?, variable_budget=?, fixed_actual=?, variable_actual=?,
                  notes=?, is_completed=?, savings_completed=?, updated_at=? WHERE month=?`,
            args: [
              b.fixedBudget ?? b.fixed_budget ?? 0,
              b.variableBudget ?? b.variable_budget ?? 0,
              b.fixedActual ?? b.fixed_actual ?? null,
              b.variableActual ?? b.variable_actual ?? null,
              b.notes ?? '',
              b.isCompleted ?? b.is_completed ?? false ? 1 : 0,
              b.savingsCompleted ?? b.savings_completed ?? false ? 1 : 0,
              now,
              month,
            ],
          })
        } else {
          await tx.execute({
            sql: `INSERT INTO budgets (id, month, fixed_budget, variable_budget, fixed_actual, variable_actual,
                  notes, is_completed, savings_completed, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              crypto.randomUUID(), month,
              b.fixedBudget ?? b.fixed_budget ?? 0,
              b.variableBudget ?? b.variable_budget ?? 0,
              b.fixedActual ?? b.fixed_actual ?? null,
              b.variableActual ?? b.variable_actual ?? null,
              b.notes ?? '',
              b.isCompleted ?? b.is_completed ?? false ? 1 : 0,
              b.savingsCompleted ?? b.savings_completed ?? false ? 1 : 0,
              now, now,
            ],
          })
        }
        imported++
      }
    }

    // Import habits
    if (Array.isArray(data.habits)) {
      for (const h of data.habits as any[]) {
        await tx.execute({
          sql: 'INSERT INTO habits (id, name, description, frequency, created_at) VALUES (?, ?, ?, ?, ?)',
          args: [h.id, h.name, h.description || '', h.frequency || 'daily', h.createdAt || h.created_at || new Date().toISOString()],
        })
        imported++
      }
    }

    // Import habit completions
    if (Array.isArray(data.habitCompletions)) {
      for (const hc of data.habitCompletions as any[]) {
        await tx.execute({
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

    await tx.commit()
    return NextResponse.json({ success: true, imported })
  } catch (e) {
    await tx.rollback()
    console.error('[backup] 恢复事务失败，已回滚:', e)
    return NextResponse.json({ error: '恢复失败，数据已回滚' }, { status: 500 })
  }
}
