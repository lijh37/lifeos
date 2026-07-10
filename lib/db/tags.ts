import { getClient } from './client'

const UNTAGGED = '__untagged__'

/**
 * 获取所有标签及其关联的笔记数量，从 notes.tags JSON 字段直接统计。
 * @returns 标签名和对应计数对象的数组
 */
export async function getAllTags(): Promise<{ name: string; count: number }[]> {
  const db = getClient()
  try {
    const result = await db.execute(`
      SELECT value as name, COUNT(*) as count
      FROM notes, json_each(
        CASE WHEN json_valid(tags) THEN tags ELSE '[]' END
      )
      WHERE value IS NOT NULL AND value != ''
      GROUP BY value
      ORDER BY count DESC, value ASC
    `)
    const tags = result.rows.map(r => ({
      name: r.name as string,
      count: r.count as number,
    }))

    // Count untagged notes (empty tags array)
    const untaggedResult = await db.execute(`
      SELECT COUNT(*) as count FROM notes
      WHERE (tags IS NULL OR tags = '[]' OR tags = '[""]')
    `)
    const untaggedCount = untaggedResult.rows[0]?.count as number || 0
    if (untaggedCount > 0) {
      tags.push({ name: UNTAGGED, count: untaggedCount })
    }

    return tags
  } catch (e) {
    console.warn('[tags] JSON标签查询失败，回退到遍历解析:', e)
    const result = await db.execute('SELECT tags FROM notes')
    const tagCount: Record<string, number> = {}
    let untaggedCount = 0
    for (const row of result.rows) {
      const tags = JSON.parse(row.tags as string) as string[]
      if (tags.length === 0 || tags.every(t => !t)) {
        untaggedCount++
      } else {
        for (const tag of tags) {
          if (tag) tagCount[tag] = (tagCount[tag] || 0) + 1
        }
      }
    }
    const entries = Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    if (untaggedCount > 0) {
      entries.push({ name: UNTAGGED, count: untaggedCount })
    }
    return entries
  }
}

/**
 * 重命名标签。同时更新 notes 表中 JSON 格式的 tags 字段。
 * 如果新旧名称相同则不操作。去重避免重复标签。
 * @param oldName - 原标签名
 * @param newName - 新标签名
 */
export async function renameTag(oldName: string, newName: string): Promise<void> {
  if (oldName === newName) return
  const db = getClient()
  const result = await db.execute('SELECT id, tags FROM notes')
  for (const row of result.rows) {
    const tags = JSON.parse(row.tags as string) as string[]
    const idx = tags.indexOf(oldName)
    if (idx !== -1) {
      tags[idx] = newName
      const deduped = [...new Set(tags)]
      await db.execute({
        sql: 'UPDATE notes SET tags = ? WHERE id = ?',
        args: [JSON.stringify(deduped), row.id],
      })
    }
  }
}

/**
 * 删除标签。从所有笔记的 tags JSON 字段中移除该标签。
 * @param tagName - 要删除的标签名
 */
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
