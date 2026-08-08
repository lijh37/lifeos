/**
 * Web/桌面端适配器：@libsql/client（本地 SQLite 文件 / Turso 远程）。
 *
 * 该模块只在 Node 运行时被 client.ts 动态加载（getClient() 的非 Capacitor 分支），
 * 不会被打进 Android 客户端 bundle。环境变量规则与原 lib/db/client.ts 一致：
 *   TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) → Turso 远程库
 *   DATABASE_URL                            → 本地 SQLite 文件 / :memory:
 */
import { createClient, type Client } from '@libsql/client'
import { mkdirSync } from 'node:fs'
import type { DbClient } from '../db-client'

const REMOTE_TURSO_RE = /turso\.(io|tech)/i

let cached: DbClient | null = null

/**
 * 创建/复用 libsql 客户端（单例）。
 * 非生产环境指向远程 Turso 时抛错（护栏，防止本地开发误连生产数据库）。
 */
export function createLibsqlDb(): DbClient {
  if (cached) return cached

  const tursoUrl = process.env.TURSO_DATABASE_URL
  const fallbackUrl = process.env.DATABASE_URL
  const url = tursoUrl || fallbackUrl
  if (!url) {
    throw new Error(
      'Database not configured. Set TURSO_DATABASE_URL (Turso remote) or DATABASE_URL (local/CI).'
    )
  }

  if (tursoUrl && process.env.NODE_ENV !== 'production' && REMOTE_TURSO_RE.test(tursoUrl)) {
    throw new Error(
      `[db] 拒绝连接远程生产数据库（${tursoUrl}）。\n` +
        `本地开发应使用本地 SQLite：在 .env.local 设置 DATABASE_URL=file:./data/dev.db，\n` +
        `并移除 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN。`
    )
  }

  const authToken = process.env.TURSO_AUTH_TOKEN

  // 本地 SQLite 文件：先确保父目录存在（libsql 不会自动创建，否则报 SQLITE_CANTOPEN(14)）
  if (!tursoUrl && url.startsWith('file:')) {
    const filePath = url.slice('file:'.length).replace(/^\.\//, '')
    const dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : ''
    if (dir) {
      try {
        mkdirSync(dir, { recursive: true })
      } catch {
        /* 目录已存在 */
      }
    }
  }

  const raw: Client = tursoUrl
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
    try {
      raw.execute('PRAGMA foreign_keys = ON')
    } catch {
      /* 某些环境不支持 PRAGMA */
    }
  }

  cached = raw as unknown as DbClient
  return cached
}
