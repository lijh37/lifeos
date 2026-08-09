/**
 * 数据库迁移 CLI（幂等 schema 初始化）
 *
 * 用法：
 *   npx tsx scripts/migrate.ts              # 执行幂等 schema 初始化（可安全重复运行）
 *   npx tsx scripts/migrate.ts --reset      # 清空所有表再重新初始化（开发用）
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
    const val = m[2].replace(/^["']|["']$/g, '')
    if (key in process.env) continue // 已注入的环境变量优先
    process.env[key] = val
  }
}
loadEnvFile('.env.local')
loadEnvFile('.env')

const RESET = process.argv.includes('--reset')

// FK 安全的删表顺序：子表（有外键指向父表的）先删
const DROP_TABLES = [
  'DROP TABLE IF EXISTS note_tags;',
  'DROP TABLE IF EXISTS habit_completions;',
  'DROP TABLE IF EXISTS attachments;',
  'DROP TABLE IF EXISTS tags;',
  'DROP TABLE IF EXISTS habits;',
  'DROP TABLE IF EXISTS budgets;',
  'DROP TABLE IF EXISTS notes;',
  'DROP TABLE IF EXISTS weight_logs;',
]

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const fallbackUrl = process.env.DATABASE_URL
  const url = tursoUrl || fallbackUrl

  if (!url) {
    console.error('❌ 未配置数据库连接。请设置 TURSO_DATABASE_URL 或 DATABASE_URL')
    process.exit(1)
  }

  const authToken = process.env.TURSO_AUTH_TOKEN

  // 本地 SQLite 文件：先确保父目录存在
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
    if (RESET) {
      console.log('⚠️  清空所有表，所有数据将丢失...')
      const isRemote = !!process.env.TURSO_DATABASE_URL

      if (isRemote) {
        const tx = await db.transaction()
        try {
          for (const stmt of DROP_TABLES) await tx.execute(stmt)
          await tx.commit()
        } catch (err) {
          await tx.rollback().catch(() => {})
          throw err
        }
      } else {
        // SQLite：PRAGMA foreign_keys 可能导致 DROP 顺序出问题，临时禁用
        await db.execute('PRAGMA foreign_keys = OFF')
        for (const stmt of DROP_TABLES) await db.execute(stmt)
        await db.execute('PRAGMA foreign_keys = ON')
      }
      console.log('🗑️  已清空所有表')
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
