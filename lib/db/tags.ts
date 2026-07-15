import type { InValue } from '@libsql/client'
import { getClient } from './client'
import { genId } from '../utils'

export async function syncNoteTags(noteId: string, tags: string[]): Promise<void> {
  const db = getClient()
  try {
    const trimmed = [...new Set(tags.map(t => t.trim()).filter(Boolean))]

    // 清除旧关联
    await db.execute({ sql: 'DELETE FROM note_tags WHERE note_id = ?', args: [noteId] })
    if (trimmed.length === 0) return

    // 批量创建不存在的标签（INSERT OR IGNORE 跳过已存在）
    const now = new Date().toISOString()
    const tagPlaceholders = trimmed.map(() => '(?, ?, ?)').join(', ')
    await db.execute({
      sql: `INSERT OR IGNORE INTO tags (id, name, created_at) VALUES ${tagPlaceholders}`,
      args: trimmed.flatMap(name => [genId(), name, now]) as InValue[],
    })

    // 一次性查询所有标签 ID
    const tagResult = await db.execute({
      sql: `SELECT id, name FROM tags WHERE name IN (${trimmed.map(() => '?').join(',')})`,
      args: trimmed as unknown as InValue[],
    })
    const tagMap = new Map<string, string>()
    for (const row of tagResult.rows) {
      tagMap.set(row.name as string, row.id as string)
    }

    // 批量插入 note_tags
    const ntPairs: [string, string][] = []
    for (const name of trimmed) {
      const id = tagMap.get(name)
      if (id) ntPairs.push([noteId, id])
    }
    if (ntPairs.length > 0) {
      const ntPlaceholders = ntPairs.map(() => '(?, ?)').join(', ')
      await db.execute({
        sql: `INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES ${ntPlaceholders}`,
        args: ntPairs.flat() as InValue[],
      })
    }
  } catch (e) { console.warn(`[tags] 同步标签失败(noteId=${noteId}, tags=${JSON.stringify(tags)}):`, e) }
}

/**
 * 获取所有标签及其关联的笔记数量，按数量降序排列。
 * 全部从规范化标签表查询。
 * @returns 标签名和对应计数对象的数组
 */
export const UNTAGGED = '__untagged__'

export async function getAllTags(): Promise<{ name: string; count: number }[]> {
  const db = getClient()
  const result = await db.execute(`
    SELECT t.name, COUNT(nt.note_id) as count
    FROM tags t
    LEFT JOIN note_tags nt ON t.id = nt.tag_id
    GROUP BY t.id
    ORDER BY count DESC, t.name ASC
  `)
  const tags = result.rows.map(r => ({
    name: r.name as string,
    count: r.count as number,
  }))

  // Get untagged note count
  const untaggedResult = await db.execute(`
    SELECT COUNT(*) as count FROM notes
    WHERE id NOT IN (SELECT DISTINCT note_id FROM note_tags)
  `)
  const untaggedCount = untaggedResult.rows[0]?.count as number || 0
  if (untaggedCount > 0) {
    tags.push({ name: UNTAGGED, count: untaggedCount })
  }

  return tags
}

/**
 * 重命名标签。如果新名称已存在则合并标签（将旧标签的笔记关联到新标签）。
 * @param oldName - 原标签名
 * @param newName - 新标签名
 */
export async function renameTag(oldName: string, newName: string): Promise<void> {
  if (oldName === newName) return
  const db = getClient()
  // Check if newName already exists — if so, merge tags
  const existing = await db.execute({ sql: 'SELECT id FROM tags WHERE name = ?', args: [newName] })
  if (existing.rows.length > 0) {
    const newId = existing.rows[0].id as string
    await db.execute({
      sql: 'UPDATE note_tags SET tag_id = ? WHERE tag_id IN (SELECT id FROM tags WHERE name = ?) AND note_id NOT IN (SELECT note_id FROM note_tags WHERE tag_id = ?)',
      args: [newId, oldName, newId],
    })
    await db.execute({ sql: 'DELETE FROM tags WHERE name = ?', args: [oldName] })
  } else {
    await db.execute({ sql: 'UPDATE tags SET name = ? WHERE name = ?', args: [newName, oldName] })
  }
}

/**
 * 删除指定标签。从规范化标签表中移除该标签。
 * @param tagName - 要删除的标签名
 */
export async function deleteTag(tagName: string): Promise<void> {
  const db = getClient()
  await db.execute({
    sql: 'DELETE FROM note_tags WHERE tag_id IN (SELECT id FROM tags WHERE name = ?)',
    args: [tagName],
  })
  await db.execute({ sql: 'DELETE FROM tags WHERE name = ?', args: [tagName] })
}
