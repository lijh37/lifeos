import type { DbClient } from './db-client'
import { MIGRATIONS } from './migrations'

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
 * 2. 遍历内联迁移定义（lib/db/migrations.ts，与 migrations/*.sql 一致）
 * 3. 对比已应用的迁移，执行新增的迁移
 * 4. 每次迁移在一个事务中完成
 * 5. 按 version 追踪已应用迁移（appliedSet.has(version)），防止重复执行
 *
 * 兼容 SQLite（:memory: / 文件）、Turso（libSQL 云端）与 capacitor-sqlite（Android）。
 * 迁移 SQL 内联进 bundle（铁律③），不再扫描文件系统。
 * 在测试中可直接调用：`await migrate(getClient())`
 */
export async function migrate(db: DbClient): Promise<void> {
  // 创建迁移追踪表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // 兼容历史 schema：旧版追踪表含 checksum TEXT NOT NULL 列，新代码不再写入
  // （CREATE TABLE IF NOT EXISTS 不会改动已存在的表，直接 INSERT 会违反 NOT NULL）。
  // 检测到该列时删除，保留已应用记录。
  const cols = await db.execute('PRAGMA table_info(_migrations)')
  const hasChecksum = cols.rows.some((row) => row.name === 'checksum')
  if (hasChecksum) {
    await db.execute('ALTER TABLE _migrations DROP COLUMN checksum')
  }

  // 读取已应用的迁移
  const applied = await db.execute('SELECT version FROM _migrations ORDER BY version')
  const appliedSet = new Set<number>()
  for (const row of applied.rows) {
    appliedSet.add(Number(row.version))
  }

  if (MIGRATIONS.length === 0) {
    console.log('[migrate] 无待执行迁移')
    return
  }

  for (const { version, name, sql } of MIGRATIONS) {
    if (appliedSet.has(version)) continue

    const statements = splitStatements(sql)
    if (statements.length === 0) continue

    console.log(`[migrate] 执行迁移: ${name}`)

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
          args: [version, name],
        })
        await tx.commit()
        console.log(`[migrate]   ✓ ${name}`)
      } catch (err) {
        try {
          await tx.rollback()
        } catch {
          /* ok */
        }
        console.error(`[migrate]   ✗ ${name} 失败`)
        throw err
      }
    } else {
      try {
        for (const stmt of statements) await db.execute(stmt)
        await db.execute({
          sql: 'INSERT INTO _migrations (version, name) VALUES (?, ?)',
          args: [version, name],
        })
        console.log(`[migrate]   ✓ ${name}`)
      } catch (err) {
        console.error(`[migrate]   ✗ ${name} 失败`)
        throw err
      }
    }
  }
}
