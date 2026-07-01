import { createClient } from '@libsql/client'
import type { InValue } from '@libsql/client'
import type { Note, NoteType, Budget, Habit, ChatMessage, Conversation, Attachment } from './types'
import { genId } from './utils'

async function syncNoteTags(noteId: string, tags: string[]): Promise<void> {
  const db = getClient()
  try {
    await db.execute({ sql: 'DELETE FROM note_tags WHERE note_id = ?', args: [noteId] })
    for (const tagName of tags) {
      if (!tagName.trim()) continue
      const existing = await db.execute({
        sql: 'SELECT id FROM tags WHERE name = ?',
        args: [tagName.trim()],
      })
      let tagId: string
      if (existing.rows.length > 0) {
        tagId = existing.rows[0].id as string
      } else {
        tagId = genId()
        await db.execute({
          sql: 'INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)',
          args: [tagId, tagName.trim(), new Date().toISOString()],
        })
      }
      await db.execute({
        sql: 'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
        args: [noteId, tagId],
      })
    }
  } catch { /* normalized tables may not exist yet */ }
}

let client: ReturnType<typeof createClient> | null = null
let dbInitialized = false
let fts5Available: boolean | undefined

/**
 * 获取数据库客户端实例（单例），优先使用 Turso 远程数据库，否则回退到本地 SQLite 文件。
 */
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

/**
 * 初始化数据库：创建所有必要的表和索引，包括 notes、chat_messages、conversations、budgets、
 * attachments、habits、habit_completions，以及 FTS5 全文索引和规范化标签表。
 * 首次调用后自动跳过重复初始化。
 */
export async function initDB() {
  if (dbInitialized) return
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
      conversation_id TEXT,
      created_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT '',
      file_size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    )
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id)
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
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_type_due ON notes(type, due_date)`)
  } catch {}
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_done ON notes(type, done)`)
  } catch {}
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at)`)
  } catch {}

  try {
    await db.execute(`ALTER TABLE chat_messages ADD COLUMN conversation_id TEXT`)
  } catch {}
  try {
    await db.execute(`ALTER TABLE notes ADD COLUMN sort_order INTEGER DEFAULT 0`)
  } catch {}

  // FTS5 full-text search (graceful fallback if not available)
  try {
    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        content, title, content=notes, content_rowid=rowid
      )
    `)
    await db.execute(`
      INSERT OR IGNORE INTO notes_fts(rowid, content, title)
      SELECT rowid, content, title FROM notes
    `)
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, content, title) VALUES (new.rowid, new.content, new.title);
      END
    `)
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, content, title) VALUES('delete', old.rowid, old.content, old.title);
      END
    `)
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, content, title) VALUES('delete', old.rowid, old.content, old.title);
        INSERT INTO notes_fts(rowid, content, title) VALUES (new.rowid, new.content, new.title);
      END
    `)
    fts5Available = true
  } catch {
    fts5Available = false
  }

  // Normalized tags tables
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      )
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (note_id, tag_id)
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id)
    `)
  } catch {}

  // Migrate existing JSON tags to normalized tables
  try {
    const migrationCheck = await db.execute('SELECT COUNT(*) as count FROM tags')
    if ((migrationCheck.rows[0]?.count as number) === 0) {
      const existingNotes = await db.execute('SELECT id, tags FROM notes')
      for (const row of existingNotes.rows) {
        const noteTags = JSON.parse(row.tags as string) as string[]
        await syncNoteTags(row.id as string, noteTags)
      }
    }
  } catch {}

  dbInitialized = true
}

/**
 * 创建或替换一个对话会话。
 * @param id - 会话 ID
 * @param title - 会话标题
 */
export async function createConversation(id: string, title: string): Promise<void> {
  const db = getClient()
  const now = new Date().toISOString()
  await db.execute({
    sql: 'INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
    args: [id, title, now, now],
  })
}

/**
 * 获取所有对话会话列表，按更新时间降序排列，附带每条对话的消息数。
 * @returns 对话数组，包含 id、标题、时间戳和消息计数
 */
export async function getConversations(): Promise<{ id: string; title: string; createdAt: string; updatedAt: string; messageCount: number }[]> {
  const db = getClient()
  const result = await db.execute(`
    SELECT c.id, c.title, c.created_at, c.updated_at,
      (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) as message_count
    FROM conversations c ORDER BY c.updated_at DESC
  `)
  return result.rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    messageCount: r.message_count as number,
  }))
}

/**
 * 删除指定对话及其所有关联的聊天消息。
 * @param id - 要删除的对话 ID
 */
export async function deleteConversation(id: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM conversations WHERE id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM chat_messages WHERE conversation_id = ?', args: [id] })
}

/**
 * 更新指定对话的标题和更新时间。
 * @param id - 对话 ID
 * @param title - 新标题
 */
export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: 'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?',
    args: [title, new Date().toISOString(), id],
  })
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

/**
 * 创建一条新笔记，同时同步其标签到规范化标签表。
 * @param note - 完整的笔记对象
 * @returns 创建后的笔记对象
 */
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
  try { await syncNoteTags(note.id, note.tags) } catch {}
  return note
}

/**
 * 更新指定笔记的部分字段（内容、标题、类型、标签、截止日期、完成状态）。
 * 如果更新包含标签，同时同步到规范化标签表。
 * @param id - 笔记 ID
 * @param updates - 包含要更新字段的部分笔记对象
 */
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
  if (updates.tags !== undefined) {
    try { await syncNoteTags(id, updates.tags) } catch {}
  }
}

/**
 * 删除指定笔记及其关联的标签和附件。
 * @param id - 要删除的笔记 ID
 */
export async function deleteNote(id: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM note_tags WHERE note_id = ?', args: [id] })
  try { await deleteAttachmentsByNoteId(id) } catch {}
  await db.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [id] })
}

/**
 * 获取笔记列表，可按类型过滤，支持分页。按 sort_order 升序、创建时间降序排列。
 * @param type - 可选，笔记类型筛选
 * @param limit - 返回条数上限（默认 200）
 * @param offset - 分页偏移量（默认 0）
 * @returns 笔记对象数组
 */
export async function getNotes(type?: NoteType, limit = 200, offset = 0): Promise<Note[]> {
  const db = getClient()
  let sql = 'SELECT * FROM notes'
  const args: InValue[] = []
  if (type) {
    sql += ' WHERE type = ?'
    args.push(type)
  }
  sql += ' ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?'
  args.push(limit, offset)
  const result = await db.execute({ sql, args })
  return result.rows.map(rowToNote)
}

/**
 * 基于游标分页获取笔记列表，支持按类型过滤。用于无限滚动场景。
 * @param type - 可选，笔记类型筛选
 * @param limit - 每页条数（默认 50，实际多取一条判断下一页）
 * @param cursor - 上一页最后一条的 created_at 时间戳
 * @returns 包含笔记数组和下一页游标的对象
 */
export async function getNotesCursor(type?: NoteType, limit = 50, cursor?: string): Promise<{ notes: Note[]; nextCursor: string | null }> {
  const db = getClient()
  let sql = 'SELECT * FROM notes'
  const args: InValue[] = []

  const conditions: string[] = []
  if (type) {
    conditions.push('type = ?')
    args.push(type)
  }
  if (cursor) {
    // cursor is the created_at timestamp of the last item from previous page
    conditions.push('created_at < ?')
    args.push(cursor)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY sort_order ASC, created_at DESC LIMIT ?'
  // Fetch one extra to determine if there's a next page
  args.push(limit + 1)

  const result = await db.execute({ sql, args })
  const rows = result.rows.map(rowToNote)

  let nextCursor: string | null = null
  if (rows.length > limit) {
    rows.pop() // remove the extra item
    nextCursor = rows[rows.length - 1].createdAt
  }

  return { notes: rows, nextCursor }
}

/**
 * 按截止日期范围查询笔记，可按类型过滤，支持分页。
 * @param startDate - 起始日期（ISO 字符串）
 * @param endDate - 结束日期（ISO 字符串）
 * @param type - 可选，笔记类型筛选
 * @param limit - 返回条数上限（默认 200）
 * @param offset - 分页偏移量（默认 0）
 * @returns 匹配日期范围的笔记数组
 */
export async function getNotesByDateRange(startDate: string, endDate: string, type?: NoteType, limit = 200, offset = 0): Promise<Note[]> {
  const db = getClient()
  let sql = 'SELECT * FROM notes WHERE due_date >= ? AND due_date <= ?'
  const args: InValue[] = [startDate, endDate]
  if (type) {
    sql += ' AND type = ?'
    args.push(type)
  }
  sql += ' ORDER BY due_date ASC, created_at DESC LIMIT ? OFFSET ?'
  args.push(limit, offset)
  const result = await db.execute({ sql, args })
  return result.rows.map(rowToNote)
}

/**
 * 统计笔记数量，可按类型过滤。
 * @param type - 可选，笔记类型筛选
 * @returns 笔记总数
 */
export async function getNotesCountByType(type?: NoteType): Promise<number> {
  const db = getClient()
  let sql = 'SELECT COUNT(*) as count FROM notes'
  const args: InValue[] = []
  if (type) {
    sql += ' WHERE type = ?'
    args.push(type)
  }
  const result = await db.execute({ sql, args })
  return result.rows[0]?.count as number || 0
}

/**
 * 根据 ID 获取单条笔记。
 * @param id - 笔记 ID
 * @returns 笔记对象，未找到时返回 null
 */
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

/**
 * 获取指定月份的预算记录。
 * @param month - 月份字符串（如 "2024-01"）
 * @returns 预算对象，未找到时返回 null
 */
export async function getBudget(month: string): Promise<Budget | null> {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM budgets WHERE month = ?',
    args: [month],
  })
  if (result.rows.length === 0) return null
  return rowToBudget(result.rows[0])
}

/**
 * 获取所有预算记录，按月降序排列。
 * @returns 预算对象数组
 */
export async function getBudgets(): Promise<Budget[]> {
  const db = getClient()
  const result = await db.execute('SELECT * FROM budgets ORDER BY month DESC')
  return result.rows.map(rowToBudget)
}

/**
 * 创建或更新指定月份的预算。如果已存在则更新部分字段，否则创建新预算记录。
 * @param month - 月份字符串（如 "2024-01"）
 * @param data - 预算的部分字段数据
 * @returns 更新后的完整预算对象
 */
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
    id: genId(),
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

/**
 * 创建一条新习惯记录。
 * @param habit - 完整的习惯对象
 * @returns 创建后的习惯对象
 */
export async function createHabit(habit: Habit): Promise<Habit> {
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO habits (id, name, description, frequency, created_at) VALUES (?, ?, ?, ?, ?)`,
    args: [habit.id, habit.name, habit.description, habit.frequency, habit.createdAt],
  })
  return habit
}

/**
 * 获取所有习惯记录，按创建时间降序排列。
 * @returns 习惯对象数组
 */
export async function getHabits(): Promise<Habit[]> {
  const db = getClient()
  const result = await db.execute('SELECT * FROM habits ORDER BY created_at DESC')
  return result.rows.map(rowToHabit)
}

/**
 * 删除指定习惯及其所有打卡记录。
 * @param id - 要删除的习惯 ID
 */
export async function deleteHabit(id: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM habits WHERE id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM habit_completions WHERE habit_id = ?', args: [id] })
}

/**
 * 切换习惯在指定日期的打卡状态（已完成/未完成）。如果当天无记录则新建打卡。
 * @param habitId - 习惯 ID
 * @param date - 日期字符串（YYYY-MM-DD）
 * @returns 切换后的完成状态（true 为已完成）
 */
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
      args: [genId(), habitId, date, 1, new Date().toISOString()],
    })
    return true
  }
}

/**
 * 计算每个习惯的连续打卡天数，从今天开始向前追溯最多 365 天。
 * @returns 以 habit_id 为键、连续打卡天数为值的映射
 */
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

/**
 * 获取所有习惯在今天（按本地日期）的打卡状态。
 * @returns 以 habit_id 为键、完成状态为值的映射
 */
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

/**
 * 按关键词搜索笔记，优先使用 FTS5 全文索引，失败时回退到 LIKE 模糊匹配。
 * 支持标题和内容搜索，返回最多 50 条结果。
 * @param query - 搜索关键词
 * @returns 匹配的笔记数组
 */
export async function searchNotes(query: string): Promise<Note[]> {
  const db = getClient()
  const term = `%${query}%`

  // Try FTS5 first, fall back to LIKE
  if (fts5Available) {
    try {
      const ftsQuery = query.replace(/['"]/g, '').split(/\s+/).filter(Boolean).join(' AND ')
      if (!ftsQuery) return []
      const result = await db.execute({
        sql: `SELECT n.* FROM notes n INNER JOIN notes_fts fts ON n.rowid = fts.rowid 
              WHERE notes_fts MATCH ? ORDER BY rank LIMIT 50`,
        args: [ftsQuery],
      })
      if (result.rows.length > 0) {
        return result.rows.map(rowToNote)
      }
    } catch {
      // FTS5 query failed — fall through to LIKE
    }
  }

  // Fallback: LIKE search
  const result = await db.execute({
    sql: `SELECT * FROM notes WHERE content LIKE ? OR title LIKE ? ORDER BY created_at DESC LIMIT 50`,
    args: [term, term],
  })
  return result.rows.map(rowToNote)
}

/**
 * 按关键词搜索习惯（名称或描述），返回最多 50 条结果。
 * @param query - 搜索关键词
 * @returns 匹配的习惯数组
 */
export async function searchHabits(query: string): Promise<Habit[]> {
  const term = `%${query}%`
  const db = getClient()
  const result = await db.execute({
    sql: `SELECT * FROM habits WHERE name LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT 50`,
    args: [term, term],
  })
  return result.rows.map(rowToHabit)
}

/**
 * 获取所有标签及其关联的笔记数量，按数量降序排列。
 * 优先从规范化标签表查询，失败时回退到 JSON 字段解析。
 * @returns 标签名和对应计数对象的数组
 */
export async function getAllTags(): Promise<{ name: string; count: number }[]> {
  const db = getClient()
  try {
    const result = await db.execute(`
      SELECT t.name, COUNT(nt.note_id) as count
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      GROUP BY t.id
      ORDER BY count DESC, t.name ASC
    `)
    return result.rows.map(r => ({
      name: r.name as string,
      count: r.count as number,
    }))
  } catch {
    // Fallback to JSON parsing
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
}

/**
 * 重命名标签。如果新名称已存在则合并标签（将旧标签的笔记关联到新标签）。
 * 同时更新 notes 表中 JSON 格式的 tags 字段。
 * @param oldName - 原标签名
 * @param newName - 新标签名
 */
export async function renameTag(oldName: string, newName: string): Promise<void> {
  if (oldName === newName) return
  const db = getClient()
  try {
    // Check if newName already exists — if so, merge tags
    const existing = await db.execute({ sql: 'SELECT id FROM tags WHERE name = ?', args: [newName] })
    if (existing.rows.length > 0) {
      const newId = existing.rows[0].id as string
      await db.execute({ sql: 'UPDATE note_tags SET tag_id = ? WHERE tag_id IN (SELECT id FROM tags WHERE name = ?) AND note_id NOT IN (SELECT note_id FROM note_tags WHERE tag_id = ?)', args: [newId, oldName, newId] })
      await db.execute({ sql: 'DELETE FROM tags WHERE name = ?', args: [oldName] })
    } else {
      await db.execute({ sql: 'UPDATE tags SET name = ? WHERE name = ?', args: [newName, oldName] })
    }
  } catch {}
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

/**
 * 删除指定标签。从规范化标签表和 notes 的 JSON 标签字段中移除该标签。
 * @param tagName - 要删除的标签名
 */
export async function deleteTag(tagName: string): Promise<void> {
  const db = getClient()
  try {
    await db.execute({ sql: 'DELETE FROM note_tags WHERE tag_id IN (SELECT id FROM tags WHERE name = ?)', args: [tagName] })
    await db.execute({ sql: 'DELETE FROM tags WHERE name = ?', args: [tagName] })
  } catch {}
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

/**
 * 获取类型为 note 的笔记总数。
 * @returns 包含 note 计数的对象
 */
export async function getNotesCount(): Promise<{ note: number }> {
  const db = getClient()
  const result = await db.execute(
    `SELECT COUNT(*) as count FROM notes WHERE type = 'note'`
  )
  return { note: result.rows[0]?.count as number || 0 }
}

/**
 * 获取预算记录总数。
 * @returns 预算数量
 */
export async function getBudgetsCount(): Promise<number> {
  const db = getClient()
  const result = await db.execute('SELECT COUNT(*) as count FROM budgets')
  return result.rows[0]?.count as number || 0
}

/**
 * 获取习惯记录总数。
 * @returns 习惯数量
 */
export async function getHabitsCount(): Promise<number> {
  const db = getClient()
  const result = await db.execute('SELECT COUNT(*) as count FROM habits')
  return result.rows[0]?.count as number || 0
}

/**
 * 创建一条附件记录，关联到指定笔记。
 * @param data - 包含 noteId、filename、url、mimeType、fileSize 的对象
 * @returns 创建的附件对象
 */
export async function createAttachment(data: {
  noteId: string
  filename: string
  url: string
  mimeType: string
  fileSize: number
}): Promise<Attachment> {
  const db = getClient()
  const id = genId()
  const now = new Date().toISOString()
  await db.execute({
    sql: 'INSERT INTO attachments (id, note_id, filename, url, mime_type, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, data.noteId, data.filename, data.url, data.mimeType, data.fileSize, now],
  })
  return {
    id,
    noteId: data.noteId,
    filename: data.filename,
    url: data.url,
    mimeType: data.mimeType,
    fileSize: data.fileSize,
    createdAt: now,
  }
}

/**
 * 获取指定笔记的所有附件，按创建时间升序排列。
 * @param noteId - 笔记 ID
 * @returns 附件对象数组
 */
export async function getAttachmentsByNoteId(noteId: string): Promise<Attachment[]> {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM attachments WHERE note_id = ? ORDER BY created_at ASC',
    args: [noteId],
  })
  return result.rows.map(row => ({
    id: row.id as string,
    noteId: row.note_id as string,
    filename: row.filename as string,
    url: row.url as string,
    mimeType: row.mime_type as string,
    fileSize: row.file_size as number,
    createdAt: row.created_at as string,
  }))
}

/**
 * 根据 ID 获取单个附件。
 * @param id - 附件 ID
 * @returns 附件对象，未找到时返回 null
 */
export async function getAttachment(id: string): Promise<Attachment | null> {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM attachments WHERE id = ?',
    args: [id],
  })
  if (result.rows.length === 0) return null
  const row = result.rows[0]
  return {
    id: row.id as string,
    noteId: row.note_id as string,
    filename: row.filename as string,
    url: row.url as string,
    mimeType: row.mime_type as string,
    fileSize: row.file_size as number,
    createdAt: row.created_at as string,
  }
}

/**
 * 删除指定附件。
 * @param id - 要删除的附件 ID
 * @returns 是否成功删除（存在且被删除返回 true）
 */
export async function deleteAttachment(id: string): Promise<boolean> {
  const db = getClient()
  const result = await db.execute({ sql: 'DELETE FROM attachments WHERE id = ?', args: [id] })
  return result.rowsAffected > 0
}

/**
 * 删除指定笔记的所有附件。
 * @param noteId - 笔记 ID
 */
export async function deleteAttachmentsByNoteId(noteId: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM attachments WHERE note_id = ?', args: [noteId] })
}

/**
 * 保存一条聊天消息到数据库（插入或替换）。
 * @param msg - 聊天消息对象
 */
export async function saveChatMessage(msg: ChatMessage): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: 'INSERT OR REPLACE INTO chat_messages (id, role, content, related_note_id, conversation_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [msg.id, msg.role, msg.content, msg.relatedNoteId, msg.conversationId, msg.createdAt],
  })
}

/**
 * 获取最近的聊天消息，按时间升序排列。
 * @param limit - 返回条数上限（默认 50）
 * @returns 聊天消息数组
 */
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
    conversationId: row.conversation_id as string | null,
    createdAt: row.created_at as string,
  }))
}

/**
 * 获取指定对话的所有聊天消息，按时间升序排列。
 * @param conversationId - 对话 ID
 * @returns 聊天消息数组
 */
export async function getChatMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    args: [conversationId],
  })
  return result.rows.map(row => ({
    id: row.id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    relatedNoteId: row.related_note_id as string | null,
    conversationId: row.conversation_id as string | null,
    createdAt: row.created_at as string,
  }))
}

/**
 * 清空所有聊天消息记录。
 */
export async function clearChatMessages(): Promise<void> {
  const db = getClient()
  await db.execute('DELETE FROM chat_messages')
}

/**
 * 清空指定表的所有数据（仅限白名单表：notes、budgets、habits、habit_completions、chat_messages）。
 * @param table - 表名
 * @throws 如果表名不在白名单中则抛出错误
 */
export async function clearTable(table: string): Promise<void> {
  const db = getClient()
  const allowed = ['notes', 'budgets', 'habits', 'habit_completions', 'chat_messages']
  if (!allowed.includes(table)) throw new Error(`Table '${table}' not allowed for clearing`)
  await db.execute(`DELETE FROM ${table}`)
}


