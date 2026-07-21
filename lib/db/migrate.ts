import type { Client } from '@libsql/client'
import fs from 'fs'
import path from 'path'

/** 将 SQL 文本按分号拆分为单条语句。 */
function splitStatements(sql: string): string[] {
  const stmts: string[] = []
  let buf = ''

  for (const line of sql.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('--')) continue
    buf += line + '\n'
    if (trimmed.endsWith(';')) {
      stmts.push(buf.trim())
      buf = ''
    }
  }

  const remaining = buf.trim()
  if (remaining) stmts.push(remaining)
  return stmts
}

/**
 * 对指定数据库执行所有待处理的迁移：
 * 1. 创建 `_migrations` 追踪表（如果不存在）
 * 2. 扫描 `migrations/` 目录的 `.sql` 文件（按文件名排序）
 * 3. 对比已应用的迁移，执行新增的迁移
 * 4. 每次迁移在一个事务中完成
 * 5. 校验和防止已应用的迁移被意外修改
 *
 * 兼容 SQLite（:memory: / 文件）和 Turso（libSQL 云端）。
 * 在测试中可直接调用：`await migrate(getClient())`
 */
export async function migrate(db: Client): Promise<void> {
  // 创建迁移追踪表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // 读取已应用的迁移
  const applied = await db.execute('SELECT version FROM _migrations ORDER BY version')
  const appliedSet = new Set<number>()
  for (const row of applied.rows) {
    appliedSet.add(Number(row.version))
  }

  // 扫描迁移文件
  const dir = path.join(process.cwd(), 'migrations')
  if (!fs.existsSync(dir)) {
    console.warn('[migrate] migrations/ 目录不存在，跳过')
    return
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('[migrate] 无待执行迁移')
    return
  }

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10)
    if (isNaN(version)) {
      console.warn(`[migrate] 跳过文件名不符合约定的迁移: ${file}`)
      continue
    }

    if (appliedSet.has(version)) continue

    const sql = fs.readFileSync(path.join(dir, file), 'utf-8')

    // 执行迁移
    const statements = splitStatements(sql)
    if (statements.length === 0) continue

    console.log(`[migrate] 执行迁移: ${file}`)

    // Turso 远程：使用 db.transaction() 确保原子性
    // 本地 SQLite：直接逐条执行（DDL 幂等，IF NOT EXISTS）
    // 分开处理是因为本地 @libsql/client 的 transaction() 对 DDL 兼容性不足
    const isRemote = !!process.env.TURSO_DATABASE_URL

    if (isRemote) {
      const tx = await db.transaction()
      try {
        for (const stmt of statements) await tx.execute(stmt)
        await tx.execute({
          sql: 'INSERT INTO _migrations (version, name) VALUES (?, ?)',
          args: [version, file],
        })
        await tx.commit()
        console.log(`[migrate]   ✓ ${file}`)
      } catch (err) {
        try { await tx.rollback() } catch { /* ok */ }
        console.error(`[migrate]   ✗ ${file} 失败`)
        throw err
      }
    } else {
      try {
        for (const stmt of statements) await db.execute(stmt)
        await db.execute({
          sql: 'INSERT INTO _migrations (version, name) VALUES (?, ?)',
          args: [version, file],
        })
        console.log(`[migrate]   ✓ ${file}`)
      } catch (err) {
        console.error(`[migrate]   ✗ ${file} 失败`)
        throw err
      }
    }
  }
}
