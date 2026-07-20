import { NextRequest, NextResponse } from 'next/server'
import { getNotes, getBudgets, getHabits } from '@/lib/db'
import { getClient } from '@/lib/db/client'
import { isAuthorized } from '@/lib/auth-guard'

interface BackupFile {
  version: string
  notes: unknown[]
  budgets?: unknown[]
  habits?: unknown[]
  habitCompletions?: unknown[]
}

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

function validateBackup(data: BackupFile): string | null {
  if (!Array.isArray(data.notes)) return '无效的备份文件：notes 必须是数组'
  for (const n of data.notes) {
    if (typeof n !== 'object' || n === null) return '无效的备份文件：notes 元素格式错误'
    const note = n as Record<string, unknown>
    if (!isString(note.id)) return '无效的备份文件：notes[].id 必须是字符串'
    if (!isString(note.content) && note.content !== null && note.content !== undefined) {
      return '无效的备份文件：notes[].content 必须是字符串'
    }
  }
  if (data.budgets !== undefined) {
    if (!Array.isArray(data.budgets)) return '无效的备份文件：budgets 必须是数组'
    for (const b of data.budgets) {
      if (typeof b !== 'object' || b === null) return '无效的备份文件：budgets 元素格式错误'
      const budget = b as Record<string, unknown>
      if (!isString(budget.month)) return '无效的备份文件：budgets[].month 必须是字符串'
    }
  }
  if (data.habits !== undefined) {
    if (!Array.isArray(data.habits)) return '无效的备份文件：habits 必须是数组'
    for (const h of data.habits) {
      if (typeof h !== 'object' || h === null) return '无效的备份文件：habits 元素格式错误'
      const habit = h as Record<string, unknown>
      if (!isString(habit.id)) return '无效的备份文件：habits[].id 必须是字符串'
    }
  }
  if (data.habitCompletions !== undefined) {
    if (!Array.isArray(data.habitCompletions)) return '无效的备份文件：habitCompletions 必须是数组'
    for (const hc of data.habitCompletions) {
      if (typeof hc !== 'object' || hc === null) return '无效的备份文件：habitCompletions 元素格式错误'
      const completion = hc as Record<string, unknown>
      if (!isString(completion.id)) return '无效的备份文件：habitCompletions[].id 必须是字符串'
      if (!isString(completion.habit_id)) return '无效的备份文件：habitCompletions[].habit_id 必须是字符串'
      if (!isString(completion.date)) return '无效的备份文件：habitCompletions[].date 必须是字符串'
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [notes, budgets, habits] = await Promise.all([
    getNotes(Number.MAX_SAFE_INTEGER),
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
  let data: BackupFile
  try {
    data = await req.json()
  } catch {
    return NextResponse.json({ error: '无效的 JSON 格式' }, { status: 400 })
  }

  if (!data.version || !Array.isArray(data.notes)) {
    return NextResponse.json({ error: '无效的备份文件' }, { status: 400 })
  }

  const validationError = validateBackup(data)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
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

    // Import notes (raw INSERT inside tx)
    for (const rawNote of data.notes) {
      const n = rawNote as Record<string, unknown>
      await tx.execute({
        sql: `INSERT INTO notes (id, content, title, type, due_date, done, pinned, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          n.id as string,
          (n.content as string) ?? '',
          (n.title as string) ?? null,
          (n.type as string) ?? 'note',
          (n.dueDate as string) ?? (n.due_date as string) ?? null,
          n.done ? 1 : 0,
          n.pinned ? 1 : 0,
          (n.createdAt as string) ?? (n.created_at as string) ?? new Date().toISOString(),
          (n.updatedAt as string) ?? (n.updated_at as string) ?? new Date().toISOString(),
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
          args: [n.id as string, tagId],
        })
      }
      imported++
    }

    // Import budgets
    if (Array.isArray(data.budgets)) {
      for (const rawBudget of data.budgets) {
        const b = rawBudget as Record<string, unknown>
        const month = b.month as string
        const existing = await tx.execute({ sql: 'SELECT id FROM budgets WHERE month = ?', args: [month] })
        const now = new Date().toISOString()
        if (existing.rows.length > 0) {
          await tx.execute({
            sql: `UPDATE budgets SET fixed_budget=?, variable_budget=?, fixed_actual=?, variable_actual=?,
                  notes=?, is_completed=?, savings_completed=?, updated_at=? WHERE month=?`,
            args: [
              (b.fixedBudget as number) ?? (b.fixed_budget as number) ?? 0,
              (b.variableBudget as number) ?? (b.variable_budget as number) ?? 0,
              (b.fixedActual as number) ?? (b.fixed_actual as number) ?? null,
              (b.variableActual as number) ?? (b.variable_actual as number) ?? null,
              (b.notes as string) ?? '',
              (b.isCompleted as boolean) ?? (b.is_completed as boolean) ?? false ? 1 : 0,
              (b.savingsCompleted as boolean) ?? (b.savings_completed as boolean) ?? false ? 1 : 0,
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
              (b.fixedBudget as number) ?? (b.fixed_budget as number) ?? 0,
              (b.variableBudget as number) ?? (b.variable_budget as number) ?? 0,
              (b.fixedActual as number) ?? (b.fixed_actual as number) ?? null,
              (b.variableActual as number) ?? (b.variable_actual as number) ?? null,
              (b.notes as string) ?? '',
              (b.isCompleted as boolean) ?? (b.is_completed as boolean) ?? false ? 1 : 0,
              (b.savingsCompleted as boolean) ?? (b.savings_completed as boolean) ?? false ? 1 : 0,
              now, now,
            ],
          })
        }
        imported++
      }
    }

    // Import habits
    if (Array.isArray(data.habits)) {
      for (const rawHabit of data.habits) {
        const h = rawHabit as Record<string, unknown>
        await tx.execute({
          sql: 'INSERT INTO habits (id, name, description, frequency, created_at) VALUES (?, ?, ?, ?, ?)',
          args: [h.id as string, h.name as string, (h.description as string) || '', (h.frequency as string) || 'daily', (h.createdAt as string) || (h.created_at as string) || new Date().toISOString()],
        })
        imported++
      }
    }

    // Import habit completions
    if (Array.isArray(data.habitCompletions)) {
      for (const rawCompletion of data.habitCompletions) {
        const hc = rawCompletion as Record<string, unknown>
        await tx.execute({
          sql: 'INSERT INTO habit_completions (id, habit_id, date, completed, created_at) VALUES (?, ?, ?, ?, ?)',
          args: [
            hc.id as string,
            hc.habit_id as string,
            hc.date as string,
            hc.completed ? 1 : 0,
            (hc.created_at as string) || new Date().toISOString(),
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
