import type { InValue } from '@libsql/client'
import type { Note, NoteType } from '../types'
import { getClient } from './client'
import { deleteAttachmentsByNoteId } from './attachments'

function rowToNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    content: (row.content as string) || '',
    title: row.title as string | null,
    type: row.type as NoteType,
    tags: JSON.parse(row.tags as string) as string[],
    dueDate: row.due_date as string | null,
    done: (row.done as number) === 1,
    pinned: (row.pinned as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/**
 * 创建一条新笔记，标签以 JSON 数组形式存入 tags 列。
 * @param note - 完整的笔记对象
 * @returns 创建后的笔记对象
 */
export async function createNote(note: Note): Promise<Note> {
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO notes (id, content, title, type, tags, due_date, done, pinned, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      note.id, note.content, note.title, note.type,
      JSON.stringify(note.tags), note.dueDate,
      note.done ? 1 : 0, note.pinned ? 1 : 0, note.createdAt, note.updatedAt,
    ] as InValue[],
  })
  return note
}

/**
 * 更新指定笔记的部分字段。
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
  if (updates.pinned !== undefined) { fields.push('pinned = ?'); args.push(updates.pinned ? 1 : 0) }
  fields.push('updated_at = ?')
  args.push(new Date().toISOString())
  args.push(id)

  await db.execute({
    sql: `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`,
    args,
  })
}

/**
 * 删除指定笔记及其关联的标签和附件。
 * @param id - 要删除的笔记 ID
 */
export async function deleteNote(id: string): Promise<void> {
  const db = getClient()
  try { await deleteAttachmentsByNoteId(id) } catch (e) { console.warn('[attachments] 删除笔记附件失败:', e) }
  await db.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [id] })
}

/**
 * 获取笔记列表，可按类型过滤，支持分页。置顶优先，再按创建时间降序。
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
  sql += ' ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?'
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
export async function getNotesCursor(type?: NoteType, limit = 50, cursor?: string, tag?: string, summary = false): Promise<{ notes: Note[]; nextCursor: string | null }> {
  const db = getClient()

  // Summary mode only fetches first 80 chars of content (for list preview)
  const selectColumns = summary
    ? "id, title, type, tags, pinned, done, created_at, updated_at, due_date, substr(content, 1, 80) AS content"
    : '*'
  let sql = `SELECT ${selectColumns} FROM notes`
  const args: InValue[] = []

  const conditions: string[] = []
  if (type) {
    conditions.push('type = ?')
    args.push(type)
  }
  if (tag === '__untagged__') {
    conditions.push("(tags IS NULL OR tags = '[]' OR tags = '[\"\"]')")
  } else if (tag) {
    conditions.push('tags LIKE ?')
    args.push(`%"${tag.trim()}"%`)
  }
  if (cursor) {
    const parsed = JSON.parse(cursor)
    const pinned = parsed.p ?? 0
    const createdAt = parsed.c ?? ''
    conditions.push('(pinned < ? OR (pinned = ? AND created_at < ?))')
    args.push(pinned, pinned, createdAt)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY pinned DESC, created_at DESC LIMIT ?'
  // Fetch one extra to determine if there's a next page
  args.push(limit + 1)

  const result = await db.execute({ sql, args })
  const rawRows = result.rows
  const notes = rawRows.map(rowToNote)

  let nextCursor: string | null = null
  if (rawRows.length > limit) {
    rawRows.pop()
    notes.pop()
    const last = rawRows[rawRows.length - 1]
    nextCursor = JSON.stringify({ p: (Number(last.pinned ?? 0)), c: last.created_at as string })
  }

  return { notes, nextCursor }
}

/**
 * 按创建日期范围查询笔记，可按类型过滤，支持分页。
 * @param startDate - 起始日期（ISO 字符串）
 * @param endDate - 结束日期（ISO 字符串）
 * @param type - 可选，笔记类型筛选
 * @param limit - 返回条数上限（默认 200）
 * @param offset - 分页偏移量（默认 0）
 * @returns 匹配日期范围的笔记数组
 */
export async function getNotesByDateRange(startDate: string, endDate: string, type?: NoteType, limit = 200, offset = 0): Promise<Note[]> {
  const db = getClient()
  let sql = 'SELECT * FROM notes WHERE created_at >= ? AND created_at <= ?'
  const args: InValue[] = [startDate, endDate]
  if (type) {
    sql += ' AND type = ?'
    args.push(type)
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  args.push(limit, offset)
  const result = await db.execute({ sql, args })
  return result.rows.map(rowToNote)
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

/**
 * 按关键词搜索笔记，优先使用 FTS5 全文索引，失败时回退到 LIKE 模糊匹配。
 * 支持标题和内容搜索，返回最多 50 条结果。
 * @param query - 搜索关键词
 * @returns 匹配的笔记数组
 */
export async function searchNotes(query: string): Promise<Note[]> {
  const db = getClient()
  const term = `%${query}%`

  const result = await db.execute({
    sql: `SELECT * FROM notes WHERE content LIKE ? OR title LIKE ? ORDER BY created_at DESC LIMIT 50`,
    args: [term, term],
  })
  return result.rows.map(rowToNote)
}


