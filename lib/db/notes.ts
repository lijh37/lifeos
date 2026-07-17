import type { InValue } from '@libsql/client'
import type { Note } from '../types'
import { getClient } from './client'
import { checkFts5 } from './fts5'
import { syncNoteTags } from './tags'


function rowToNote(row: Record<string, unknown>, tags: string[] = []): Note {
  return {
    id: row.id as string,
    content: (row.content as string) || '',
    title: row.title as string | null,
    type: 'note',
    tags,
    dueDate: row.due_date as string | null,
    done: (row.done as number) === 1,
    pinned: (row.pinned as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/** 批量查询多条笔记的标签（通过 note_tags 规范化表） */
async function fetchTagsForNotes(noteIds: string[]): Promise<Map<string, string[]>> {
  if (noteIds.length === 0) return new Map()
  const db = getClient()
  const placeholders = noteIds.map(() => '?').join(',')
  const result = await db.execute({
    sql: `SELECT nt.note_id, t.name FROM note_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.note_id IN (${placeholders}) ORDER BY t.name`,
    args: noteIds as unknown as InValue[],
  })
  const tagMap = new Map<string, string[]>()
  for (const row of result.rows) {
    const noteId = row.note_id as string
    if (!tagMap.has(noteId)) tagMap.set(noteId, [])
    tagMap.get(noteId)!.push(row.name as string)
  }
  return tagMap
}

/**
 * 创建一条新笔记，同时同步其标签到规范化标签表。
 * @param note - 完整的笔记对象
 * @returns 创建后的笔记对象
 */
export async function createNote(note: Note): Promise<Note> {
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO notes (id, content, title, type, due_date, done, pinned, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      note.id, note.content, note.title, note.type, note.dueDate,
      note.done ? 1 : 0, note.pinned ? 1 : 0, note.createdAt, note.updatedAt,
    ] as InValue[],
  })
  try { await syncNoteTags(note.id, note.tags) } catch (e) { console.warn('[tags] 笔记标签同步失败(createNote):', e) }
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
  if (updates.tags !== undefined) {
    try { await syncNoteTags(id, updates.tags) } catch (e) { console.warn('[tags] 笔记标签同步失败(updateNote):', e) }
  }
}

/**
 * 删除指定笔记及其关联的标签和附件。
 * @param id - 要删除的笔记 ID
 */
export async function deleteNote(id: string): Promise<void> {
  const db = getClient()
  // note_tags 和 attachments 通过 FK CASCADE 自动清理
  await db.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [id] })
}

/**
 * 获取笔记列表，可按类型过滤，支持分页。置顶优先，再按创建时间降序。
 * @param type - 可选，笔记类型筛选
 * @param limit - 返回条数上限（默认 200）
 * @param offset - 分页偏移量（默认 0）
 * @returns 笔记对象数组
 */
export async function getNotes(type?: 'note', limit = 200, offset = 0): Promise<Note[]> {
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
  const ids = result.rows.map(r => r.id as string)
  const tagMap = await fetchTagsForNotes(ids)
  return result.rows.map(row => rowToNote(row, tagMap.get(row.id as string) || []))
}

/**
 * 基于游标分页获取笔记列表，支持按类型过滤。用于无限滚动场景。
 * @param type - 可选，笔记类型筛选
 * @param limit - 每页条数（默认 50，实际多取一条判断下一页）
 * @param cursor - 上一页最后一条的 created_at 时间戳
 * @returns 包含笔记数组和下一页游标的对象
 */
export async function getNotesCursor(type?: 'note', limit = 50, cursor?: string, tag?: string, summary = false): Promise<{ notes: Note[]; nextCursor: string | null }> {
  const db = getClient()

  // Use table-qualified columns so we can add JOINs for tag filtering
  // Summary mode only fetches first 80 chars of content (for list preview)
  const selectColumns = summary
    ? "notes.id, notes.title, notes.type, notes.pinned, notes.done, notes.created_at, notes.updated_at, notes.due_date, substr(notes.content, 1, 80) AS content"
    : 'notes.*'
  let sql = `SELECT ${selectColumns} FROM notes`
  const args: InValue[] = []

  const UNTAGGED = '__untagged__'
  if (tag === UNTAGGED) {
    sql += ' LEFT JOIN note_tags ON notes.id = note_tags.note_id'
  } else if (tag) {
    sql += ' INNER JOIN note_tags ON notes.id = note_tags.note_id INNER JOIN tags ON note_tags.tag_id = tags.id'
  }

  const conditions: string[] = []
  if (type) {
    conditions.push('notes.type = ?')
    args.push(type)
  }
  if (tag === UNTAGGED) {
    conditions.push('note_tags.note_id IS NULL')
  } else if (tag) {
    conditions.push('tags.name = ?')
    args.push(tag.trim())
  }
  if (cursor) {
    const parsed = JSON.parse(cursor)
    const pinned = parsed.p ?? 0
    const createdAt = parsed.c ?? ''
    conditions.push('(notes.pinned < ? OR (notes.pinned = ? AND notes.created_at < ?))')
    args.push(pinned, pinned, createdAt)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY notes.pinned DESC, notes.created_at DESC LIMIT ?'
  // Fetch one extra to determine if there's a next page
  args.push(limit + 1)

  const result = await db.execute({ sql, args })
  const rawRows = [...result.rows]

  let nextCursor: string | null = null
  if (rawRows.length > limit) {
    rawRows.pop()
    const last = rawRows[rawRows.length - 1]
    nextCursor = JSON.stringify({ p: (Number(last.pinned ?? 0)), c: last.created_at as string })
  }

  const ids = rawRows.map(r => r.id as string)
  const tagMap = await fetchTagsForNotes(ids)
  const notes = rawRows.map(row => rowToNote(row, tagMap.get(row.id as string) || []))

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
export async function getNotesByDateRange(startDate: string, endDate: string, type?: 'note', limit = 200, offset = 0): Promise<Note[]> {
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
  const ids = result.rows.map(r => r.id as string)
  const tagMap = await fetchTagsForNotes(ids)
  return result.rows.map(row => rowToNote(row, tagMap.get(row.id as string) || []))
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
  const tagsResult = await db.execute({
    sql: 'SELECT t.name FROM note_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.note_id = ? ORDER BY t.name',
    args: [id],
  })
  const tags = tagsResult.rows.map(r => r.name as string)
  return rowToNote(result.rows[0], tags)
}

/**
 * 按关键词搜索笔记，优先使用 FTS5 全文索引，失败时回退到 LIKE 模糊匹配。
 * 支持标题和内容搜索，返回最多 50 条结果。
 * @param query - 搜索关键词
 * @returns 匹配的笔记数组
 */
export async function searchNotes(query: string, tag?: string): Promise<Note[]> {
  const db = getClient()
  const term = `%${query}%`
  const UNTAGGED = '__untagged__'

  // Try FTS5 first, fall back to LIKE
  if (await checkFts5()) {
    try {
      const ftsQuery = query.replace(/['"]/g, '').split(/\s+/).filter(Boolean).join(' AND ')
      if (!ftsQuery) return []

      let sql: string
      const sqlArgs: InValue[] = [ftsQuery]

      if (tag === UNTAGGED) {
        sql = `SELECT n.* FROM notes n
               INNER JOIN notes_fts fts ON n.rowid = fts.rowid
               LEFT JOIN note_tags nt ON n.id = nt.note_id
               WHERE notes_fts MATCH ? AND nt.note_id IS NULL
               ORDER BY rank LIMIT 50`
      } else if (tag) {
        sql = `SELECT n.* FROM notes n
               INNER JOIN notes_fts fts ON n.rowid = fts.rowid
               INNER JOIN note_tags nt ON n.id = nt.note_id
               INNER JOIN tags t ON nt.tag_id = t.id
               WHERE notes_fts MATCH ? AND t.name = ?
               ORDER BY rank LIMIT 50`
        sqlArgs.push(tag)
      } else {
        sql = `SELECT n.* FROM notes n
               INNER JOIN notes_fts fts ON n.rowid = fts.rowid
               WHERE notes_fts MATCH ?
               ORDER BY rank LIMIT 50`
      }

      const result = await db.execute({ sql, args: sqlArgs })
      if (result.rows.length > 0) {
        const ids = result.rows.map(r => r.id as string)
        const tagMap = await fetchTagsForNotes(ids)
        return result.rows.map(row => rowToNote(row, tagMap.get(row.id as string) || []))
      }
    } catch (e) { console.warn('[fts5] 全文搜索查询失败，回退到 LIKE:', e) }
  }

  // Fallback: LIKE search
  let sql = `SELECT * FROM notes WHERE (content LIKE ? OR title LIKE ?)`
  const sqlArgs: InValue[] = [term, term]

  if (tag === UNTAGGED) {
    sql += ` AND id NOT IN (SELECT note_id FROM note_tags)`
  } else if (tag) {
    sql += ` AND id IN (SELECT nt.note_id FROM note_tags nt INNER JOIN tags t ON nt.tag_id = t.id WHERE t.name = ?)`
    sqlArgs.push(tag)
  }

  sql += ` ORDER BY created_at DESC LIMIT 50`

  const result = await db.execute({ sql, args: sqlArgs })
  const ids = result.rows.map(r => r.id as string)
  const tagMap = await fetchTagsForNotes(ids)
  return result.rows.map(row => rowToNote(row, tagMap.get(row.id as string) || []))
}


