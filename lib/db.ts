import { createClient } from '@libsql/client'
import type { InValue } from '@libsql/client'
import type { Note, ChatMessage, NoteType } from './types'

const url = process.env.DATABASE_URL || 'file:./data/life.db'

let client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!client) {
    client = createClient({ url })
  }
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

export async function getNote(id: string): Promise<Note | null> {
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT * FROM notes WHERE id = ?', args: [id] })
  if (result.rows.length === 0) return null
  return rowToNote(result.rows[0])
}

export async function searchNotes(query: string): Promise<Note[]> {
  const term = `%${query}%`
  const db = getClient()
  const result = await db.execute({
    sql: `SELECT * FROM notes WHERE content LIKE ? OR title LIKE ? ORDER BY created_at DESC`,
    args: [term, term],
  })
  return result.rows.map(rowToNote)
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

export async function saveMessage(msg: ChatMessage): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO chat_messages (id, role, content, related_note_id, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [msg.id, msg.role, msg.content, msg.relatedNoteId, msg.createdAt],
  })
}

export async function getRecentMessages(limit = 50): Promise<ChatMessage[]> {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT ?',
    args: [limit],
  })
  return result.rows.reverse().map((row) => ({
    id: row.id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    relatedNoteId: row.related_note_id as string | null,
    createdAt: row.created_at as string,
  }))
}
