import type { Attachment } from '../types'
import { getClient } from './client'
import { genId } from '../utils'

function rowToAttachment(row: Record<string, unknown>): Attachment {
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
  return result.rows.map(rowToAttachment)
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
  return rowToAttachment(result.rows[0])
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
