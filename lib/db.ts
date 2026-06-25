import { createClient } from '@libsql/client'
import type { InValue } from '@libsql/client'
import type { Note, NoteType, Budget, Habit, ChatMessage } from './types'

let client: ReturnType<typeof createClient> | null = null

export function getClient() {
  if (client) return client
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const url = tursoUrl || process.env.DATABASE_URL || 'file:./data/life.db'
  const authToken = process.env.TURSO_AUTH_TOKEN
  client = tursoUrl
    ? createClient({ url: tursoUrl, authToken })
    : createClient({ url })
  return client
}

export async function initDB() {
  const db = getClient()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      title TEXT,
      type TEXT NOT NULL DEFAULT 'note',
      tags TEXT DEFAULT '[]',
      due_date TEXT,
      done INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      related_note_id TEXT,
      created_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type)
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at)
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_due_date ON notes(due_date)
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL UNIQUE,
      fixed_budget REAL NOT NULL DEFAULT 0,
      variable_budget REAL NOT NULL DEFAULT 0,
      fixed_actual REAL DEFAULT NULL,
      variable_actual REAL DEFAULT NULL,
      notes TEXT DEFAULT '',
      is_completed INTEGER DEFAULT 0,
      savings_completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      frequency TEXT NOT NULL DEFAULT 'daily',
      created_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id)
  `)
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_unique ON habit_completions(habit_id, date)
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_search ON notes(content, title)
  `)
}

function rowToNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    content: row.content as string,
    title: row.title as string | null,
    type: row.type as NoteType,
    tags: JSON.parse(row.tags as string) as string[],
    dueDate: row.due_date as string | null,
    done: (row.done as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function createNote(note: Note): Promise<Note> {
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO notes (id, content, title, type, tags, due_date, done, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      note.id, note.content, note.title, note.type,
      JSON.stringify(note.tags), note.dueDate,
      note.done ? 1 : 0, note.createdAt, note.updatedAt,
    ] as InValue[],
  })
  return note
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<void> {
  const db = getClient()
  const fields: string[] = []
  const args: InValue[] = []

  if (updates.content !== undefined) { fields.push('content = ?'); args.push(updates.content) }
  if (updates.title !== undefined) { fields.push('title = ?'); args.push(updates.title) }
  if (updates.type !== undefined) { fields.push('type = ?'); args.push(updates.type) }
  if (updates.tags !== undefined) { fields.push('tags = ?'); args.push(JSON.stringify(updates.tags)) }
  if (updates.dueDate !== undefined) { fields.push('due_date = ?'); args.push(updates.dueDate) }
  if (updates.done !== undefined) { fields.push('done = ?'); args.push(updates.done ? 1 : 0) }
  fields.push('updated_at = ?')
  args.push(new Date().toISOString())
  args.push(id)

  await db.execute({
    sql: `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`,
    args,
  })
}

export async function deleteNote(id: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [id] })
}

export async function getNotes(type?: NoteType): Promise<Note[]> {
  const db = getClient()
  let sql = 'SELECT * FROM notes'
  const args: InValue[] = []
  if (type) {
    sql += ' WHERE type = ?'
    args.push(type)
  }
  sql += ' ORDER BY created_at DESC'
  const result = await db.execute({ sql, args })
  return result.rows.map(rowToNote)
}

export async function getNotesByDateRange(startDate: string, endDate: string, type?: NoteType): Promise<Note[]> {
  const db = getClient()
  let sql = 'SELECT * FROM notes WHERE due_date >= ? AND due_date <= ?'
  const args: InValue[] = [startDate, endDate]
  if (type) {
    sql += ' AND type = ?'
    args.push(type)
  }
  sql += ' ORDER BY due_date ASC, created_at DESC'
  const result = await db.execute({ sql, args })
  return result.rows.map(rowToNote)
}

export async function getNote(id: string): Promise<Note | null> {
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT * FROM notes WHERE id = ?', args: [id] })
  if (result.rows.length === 0) return null
  return rowToNote(result.rows[0])
}

function rowToBudget(row: Record<string, unknown>): Budget {
  return {
    id: row.id as string,
    month: row.month as string,
    fixedBudget: row.fixed_budget as number,
    variableBudget: row.variable_budget as number,
    fixedActual: row.fixed_actual as number | null,
    variableActual: row.variable_actual as number | null,
    notes: row.notes as string,
    isCompleted: (row.is_completed as number) === 1,
    savingsCompleted: (row.savings_completed as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function getBudget(month: string): Promise<Budget | null> {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM budgets WHERE month = ?',
    args: [month],
  })
  if (result.rows.length === 0) return null
  return rowToBudget(result.rows[0])
}

export async function getBudgets(): Promise<Budget[]> {
  const db = getClient()
  const result = await db.execute('SELECT * FROM budgets ORDER BY month DESC')
  return result.rows.map(rowToBudget)
}

export async function upsertBudget(month: string, data: Partial<Budget>): Promise<Budget> {
  const db = getClient()
  const existing = await getBudget(month)
  const now = new Date().toISOString()

  if (existing) {
    const fields: string[] = []
    const args: InValue[] = []
    if (data.fixedBudget !== undefined) { fields.push('fixed_budget = ?'); args.push(data.fixedBudget) }
    if (data.variableBudget !== undefined) { fields.push('variable_budget = ?'); args.push(data.variableBudget) }
    if (data.fixedActual !== undefined) { fields.push('fixed_actual = ?'); args.push(data.fixedActual) }
    if (data.variableActual !== undefined) { fields.push('variable_actual = ?'); args.push(data.variableActual) }
    if (data.notes !== undefined) { fields.push('notes = ?'); args.push(data.notes) }
    if (data.isCompleted !== undefined) { fields.push('is_completed = ?'); args.push(data.isCompleted ? 1 : 0) }
    if (data.savingsCompleted !== undefined) { fields.push('savings_completed = ?'); args.push(data.savingsCompleted ? 1 : 0) }
    fields.push('updated_at = ?')
    args.push(now)
    args.push(existing.id)
    await db.execute({
      sql: `UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`,
      args,
    })
    const clean = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as Record<string, unknown>
    return { ...existing, ...clean, updatedAt: now } as Budget
  }

  const budget: Budget = {
    id: crypto.randomUUID(),
    month,
    fixedBudget: data.fixedBudget ?? 0,
    variableBudget: data.variableBudget ?? 0,
    fixedActual: data.fixedActual ?? null,
    variableActual: data.variableActual ?? null,
    notes: data.notes ?? '',
    isCompleted: data.isCompleted ?? false,
    savingsCompleted: data.savingsCompleted ?? false,
    createdAt: now,
    updatedAt: now,
  }
  await db.execute({
    sql: `INSERT INTO budgets (id, month, fixed_budget, variable_budget, fixed_actual, variable_actual, notes, is_completed, savings_completed, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [budget.id, budget.month, budget.fixedBudget, budget.variableBudget, budget.fixedActual, budget.variableActual, budget.notes, budget.isCompleted ? 1 : 0, budget.savingsCompleted ? 1 : 0, budget.createdAt, budget.updatedAt],
  })
  return budget
}

function rowToHabit(row: Record<string, unknown>): Habit {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    frequency: row.frequency as 'daily' | 'weekly',
    createdAt: row.created_at as string,
  }
}

export async function createHabit(habit: Habit): Promise<Habit> {
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO habits (id, name, description, frequency, created_at) VALUES (?, ?, ?, ?, ?)`,
    args: [habit.id, habit.name, habit.description, habit.frequency, habit.createdAt],
  })
  return habit
}

export async function getHabits(): Promise<Habit[]> {
  const db = getClient()
  const result = await db.execute('SELECT * FROM habits ORDER BY created_at DESC')
  return result.rows.map(rowToHabit)
}

export async function deleteHabit(id: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM habits WHERE id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM habit_completions WHERE habit_id = ?', args: [id] })
}

export async function toggleCompletion(habitId: string, date: string): Promise<boolean> {
  const db = getClient()
  const existing = await db.execute({
    sql: 'SELECT id, completed FROM habit_completions WHERE habit_id = ? AND date = ?',
    args: [habitId, date],
  })
  if (existing.rows.length > 0) {
    const row = existing.rows[0]
    const newCompleted = (row.completed as number) === 0 ? 1 : 0
    await db.execute({
      sql: 'UPDATE habit_completions SET completed = ? WHERE id = ?',
      args: [newCompleted, row.id],
    })
    return newCompleted === 1
  } else {
    await db.execute({
      sql: 'INSERT INTO habit_completions (id, habit_id, date, completed, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), habitId, date, 1, new Date().toISOString()],
    })
    return true
  }
}

export async function getStreaks(): Promise<Record<string, number>> {
  const db = getClient()
  const rows = (await db.execute(
    `SELECT habit_id, date FROM habit_completions WHERE completed = 1 ORDER BY habit_id, date DESC`
  )).rows

  const streaks: Record<string, number> = {}
  const today = new Date().toISOString().slice(0, 10)

  for (let i = 0; i < rows.length; ) {
    const hid = rows[i].habit_id as string
    if (streaks[hid] !== undefined) { i++; continue }

    let streak = 0
    const cutoff = new Date()
    for (let j = 0; j < 365; j++) {
      const dateStr = cutoff.toISOString().slice(0, 10)
      if (i < rows.length && rows[i].habit_id === hid && rows[i].date === dateStr) {
        streak++
        i++
      } else if (j > 0 || dateStr !== today) {
        break
      }
      cutoff.setDate(cutoff.getDate() - 1)
    }
    streaks[hid] = streak
  }
  return streaks
}

export async function getTodayCompletions(): Promise<Record<string, boolean>> {
  const today = new Date().toISOString().slice(0, 10)
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT habit_id, completed FROM habit_completions WHERE date = ?',
    args: [today],
  })
  const map: Record<string, boolean> = {}
  for (const row of result.rows) {
    map[row.habit_id as string] = (row.completed as number) === 1
  }
  return map
}

export async function searchNotes(query: string): Promise<Note[]> {
  const term = `%${query}%`
  const db = getClient()
  const result = await db.execute({
    sql: `SELECT * FROM notes WHERE content LIKE ? OR title LIKE ? ORDER BY created_at DESC LIMIT 50`,
    args: [term, term],
  })
  return result.rows.map(rowToNote)
}

export async function searchHabits(query: string): Promise<Habit[]> {
  const term = `%${query}%`
  const db = getClient()
  const result = await db.execute({
    sql: `SELECT * FROM habits WHERE name LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT 50`,
    args: [term, term],
  })
  return result.rows.map(rowToHabit)
}

export async function getAllTags(): Promise<{ name: string; count: number }[]> {
  const db = getClient()
  const result = await db.execute('SELECT tags FROM notes')
  const tagCount: Record<string, number> = {}
  for (const row of result.rows) {
    const tags = JSON.parse(row.tags as string) as string[]
    for (const tag of tags) {
      if (tag) tagCount[tag] = (tagCount[tag] || 0) + 1
    }
  }
  return Object.entries(tagCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export async function renameTag(oldName: string, newName: string): Promise<void> {
  const db = getClient()
  const result = await db.execute('SELECT id, tags FROM notes')
  for (const row of result.rows) {
    const tags = JSON.parse(row.tags as string) as string[]
    const idx = tags.indexOf(oldName)
    if (idx !== -1) {
      tags[idx] = newName
      await db.execute({
        sql: 'UPDATE notes SET tags = ? WHERE id = ?',
        args: [JSON.stringify(tags), row.id],
      })
    }
  }
}

export async function deleteTag(tagName: string): Promise<void> {
  const db = getClient()
  const result = await db.execute('SELECT id, tags FROM notes')
  for (const row of result.rows) {
    const tags = JSON.parse(row.tags as string) as string[]
    const filtered = tags.filter((t: string) => t !== tagName)
    if (filtered.length !== tags.length) {
      await db.execute({
        sql: 'UPDATE notes SET tags = ? WHERE id = ?',
        args: [JSON.stringify(filtered), row.id],
      })
    }
  }
}

export async function getNotesCount(): Promise<{ note: number; task: number; event: number }> {
  const db = getClient()
  const result = await db.execute(
    `SELECT type, COUNT(*) as count FROM notes GROUP BY type`
  )
  const counts = { note: 0, task: 0, event: 0 }
  for (const row of result.rows) {
    const t = row.type as NoteType
    counts[t] = row.count as number
  }
  return counts
}

export async function getBudgetsCount(): Promise<number> {
  const db = getClient()
  const result = await db.execute('SELECT COUNT(*) as count FROM budgets')
  return result.rows[0]?.count as number || 0
}

export async function getHabitsCount(): Promise<number> {
  const db = getClient()
  const result = await db.execute('SELECT COUNT(*) as count FROM habits')
  return result.rows[0]?.count as number || 0
}

export async function saveChatMessage(msg: ChatMessage): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: 'INSERT OR REPLACE INTO chat_messages (id, role, content, related_note_id, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [msg.id, msg.role, msg.content, msg.relatedNoteId, msg.createdAt],
  })
}

export async function getRecentChatMessages(limit = 50): Promise<ChatMessage[]> {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT ?',
    args: [limit],
  })
  return result.rows.map(row => ({
    id: row.id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    relatedNoteId: row.related_note_id as string | null,
    createdAt: row.created_at as string,
  }))
}

export async function clearChatMessages(): Promise<void> {
  const db = getClient()
  await db.execute('DELETE FROM chat_messages')
}

export async function clearTable(table: string): Promise<void> {
  const db = getClient()
  const allowed = ['notes', 'budgets', 'habits', 'habit_completions', 'chat_messages']
  if (!allowed.includes(table)) throw new Error(`Table '${table}' not allowed for clearing`)
  await db.execute(`DELETE FROM ${table}`)
}


