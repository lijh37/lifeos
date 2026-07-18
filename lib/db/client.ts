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
 *
 * 环境护栏：非生产环境下若指向远程 Turso（turso.io / turso.tech），直接抛错，
 * 防止本地开发误连生产数据库。生产环境（NODE_ENV=production）不受此限制。
 */
const REMOTE_TURSO_RE = /turso\.(io|tech)/i

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

  // 护栏：本地/CI 不允许直连远程生产 Turso
  if (tursoUrl && process.env.NODE_ENV !== 'production' && REMOTE_TURSO_RE.test(tursoUrl)) {
    throw new Error(
      `[db] 拒绝连接远程生产数据库（${tursoUrl}）。\n` +
      `本地开发应使用本地 SQLite：在 .env.local 设置 DATABASE_URL=file:./data/dev.db，\n` +
      `并移除 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN。`
    )
  }

  const authToken = process.env.TURSO_AUTH_TOKEN

  // 本地 SQLite 文件：先确保父目录存在（libsql 不会自动创建父目录，否则报 SQLITE_CANTOPEN(14)）
  if (!tursoUrl && url.startsWith('file:')) {
    const filePath = url.slice('file:'.length).replace(/^\.\//, '')
    const dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : ''
    if (dir) {
      try { require('node:fs').mkdirSync(dir, { recursive: true }) } catch { /* 目录已存在 */ }
    }
  }

  client = tursoUrl
    ? createClient({ url: tursoUrl, authToken })
    : createClient({ url })

  // 启动期身份日志：一眼看清当前连的是哪个库
  if (tursoUrl) {
    console.log(`[db] turso → ${tursoUrl.replace(REMOTE_TURSO_RE, 'turso')}`)
  } else {
    console.log(`[db] sqlite → ${url}`)
  }

  // 仅本地 SQLite 需要手动启用外键（Turso/libSQL 云端原生支持）
  if (!tursoUrl) {
    try { client.execute('PRAGMA foreign_keys = ON') } catch { /* 某些环境不支持 PRAGMA */ }
  }

  return client
}
