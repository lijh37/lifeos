import { createClient } from '@libsql/client'

let client: ReturnType<typeof createClient> | null = null

/**
 * 获取数据库客户端实例（单例）：
 * - 生产环境：TURSO_DATABASE_URL → Turso 远程数据库（需 TURSO_AUTH_TOKEN）
 * - 本地/CI： DATABASE_URL → SQLite 文件或 :memory:
 *
 * 本函数仅负责连接管理，不执行任何 DDL。
 * schema 初始化请调用 migrate()（@/lib/db/migrate）或运行 `npx tsx scripts/migrate.ts`。
 *
 * 首次调用时自动启用 PRAGMA foreign_keys（仅本地 SQLite 需要）。
 */
export function getClient() {
  if (client) return client

  const tursoUrl = process.env.TURSO_DATABASE_URL
  const fallbackUrl = process.env.DATABASE_URL
  const url = tursoUrl || fallbackUrl
  if (!url) {
    throw new Error(
      'Database not configured. Set TURSO_DATABASE_URL (Turso remote) or DATABASE_URL (local/CI).'
    )
  }
  const authToken = process.env.TURSO_AUTH_TOKEN
  client = tursoUrl
    ? createClient({ url: tursoUrl, authToken })
    : createClient({ url })

  // 仅本地 SQLite 需要手动启用外键（Turso/libSQL 云端原生支持）
  if (!tursoUrl) {
    try { client.execute('PRAGMA foreign_keys = ON') } catch { /* 某些环境不支持 PRAGMA */ }
  }

  return client
}
