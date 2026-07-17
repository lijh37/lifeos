import { getClient } from './client'

let fts5Available: boolean | undefined

/**
 * 运行时检测 FTS5 全文索引是否可用。
 * 探测结果会被缓存，多次调用只执行一次。
 * 迁移阶段创建 FTS5 表失败时，由本函数优雅回退到 LIKE 搜索。
 */
export async function checkFts5(): Promise<boolean> {
  if (fts5Available !== undefined) return fts5Available
  try {
    const db = getClient()
    await db.execute('SELECT count(*) FROM notes_fts')
    fts5Available = true
  } catch {
    console.warn('[fts5] FTS5 不可用（notes_fts 表不存在），回退到 LIKE 搜索')
    fts5Available = false
  }
  return fts5Available
}
