/**
 * 数据库迁移 CLI
 *
 * 用法：
 *   npx tsx scripts/migrate.ts              # 执行所有待处理迁移
 *   npx tsx scripts/migrate.ts --dry-run    # 仅列出待执行迁移，不实际运行
 *
 * 环境变量：（与运行时 getClient() 规则一致）
 *   TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) — 生产环境 Turso 远程库
 *   DATABASE_URL                            — 本地 SQLite 文件或 :memory:
 */

import { createClient } from '@libsql/client'
import { migrate } from '../lib/db/migrate'
import fs from 'fs'
import path from 'path'

// 加载本地环境变量文件（Next.js 会自动加载 .env.local，但独立运行 tsx 时不会）。
// 仅当对应文件存在时加载；Docker / Vercel 由平台注入环境变量，无需文件。
function loadEnvFile(file: string) {
  const p = path.join(process.cwd(), file)
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([\w.]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].replace(/^["']|["']$/g, '')
    if (key in process.env) continue // 已注入的环境变量优先
    process.env[key] = val
  }
}
loadEnvFile('.env.local')
loadEnvFile('.env')

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const fallbackUrl = process.env.DATABASE_URL
  const url = tursoUrl || fallbackUrl

  if (!url) {
    console.error('❌ 未配置数据库连接。请设置 TURSO_DATABASE_URL 或 DATABASE_URL')
    process.exit(1)
  }

  const authToken = process.env.TURSO_AUTH_TOKEN

  // 本地 SQLite 文件：先确保父目录存在（libsql 不会自动创建父目录，否则报 SQLITE_CANTOPEN(14)）
  if (!tursoUrl && url.startsWith('file:')) {
    const filePath = url.slice('file:'.length).replace(/^\.\//, '')
    const dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : ''
    if (dir) {
      try { fs.mkdirSync(dir, { recursive: true }) } catch { /* 目录已存在 */ }
    }
  }

  const db = authToken
    ? createClient({ url, authToken })
    : createClient({ url })

  try {
    if (DRY_RUN) {
      // 列出待执行迁移
      try {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `)
      } catch { /* first run may fail, ignore */ }

      const applied = await db.execute('SELECT version FROM _migrations ORDER BY version')
      const appliedVersions = new Set(applied.rows.map(r => Number(r.version)))

      const dir = path.join(process.cwd(), 'migrations')
      if (!fs.existsSync(dir)) {
        console.log('📂 migrations/ 目录不存在')
        return
      }

      const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
      const pending = files.filter(f => {
        const v = parseInt(f.split('_')[0], 10)
        return !isNaN(v) && !appliedVersions.has(v)
      })

      if (pending.length === 0) {
        console.log('✅ 所有迁移已执行')
      } else {
        console.log(`📋 待执行迁移 (${pending.length}):`)
        for (const f of pending) console.log(`   ${f}`)
      }
      return
    }

    await migrate(db)
    console.log('✅ 迁移完成')
  } catch (err) {
    console.error('❌ 迁移失败:', err)
    process.exit(1)
  } finally {
    db.close()
  }
}

main()
