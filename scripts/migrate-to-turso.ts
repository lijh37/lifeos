/**
 * 数据迁移脚本：本地 SQLite → Turso
 *
 * 用法：
 *   npx tsx scripts/migrate-to-turso.ts
 *
 * 前置条件：
 *   1. 安装 Turso CLI: curl -sSfL https://get.turso.dev | sh
 *   2. 创建数据库: turso db create lifeos
 *   3. 获取 URL 和 Token: turso db show lifeos / turso db tokens create lifeos
 *   4. 设置环境变量:
 *      export TURSO_DATABASE_URL=libsql://lifeos-xxx.turso.io
 *      export TURSO_AUTH_TOKEN=xxx
 */

import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const LOCAL_DB_PATH = join(import.meta.dirname, '..', 'data', 'life.db')

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!tursoUrl || !authToken) {
    console.error('请设置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN 环境变量')
    process.exit(1)
  }

  console.log('连接本地数据库...')
  const local = createClient({ url: `file:${LOCAL_DB_PATH}` })

  console.log('连接 Turso 远程数据库...')
  const remote = createClient({ url: tursoUrl, authToken })

  // 在远程创建表结构
  console.log('创建远程表结构...')
  const schema = readFileSync(join(import.meta.dirname, '..', 'data', 'schema.sql'), 'utf-8')
  await remote.execute(schema)

  // 迁移数据
  const tables = ['notes', 'chat_messages', 'budgets', 'habits', 'habit_completions']

  for (const table of tables) {
    console.log(`迁移 ${table}...`)
    const rows = await local.execute(`SELECT * FROM ${table}`)

    if (rows.rows.length === 0) {
      console.log(`  ${table}: 无数据，跳过`)
      continue
    }

    // 逐行插入远程
    for (const row of rows.rows) {
      const columns = Object.keys(row)
      const placeholders = columns.map(() => '?').join(', ')
      const values = Object.values(row)

      await remote.execute({
        sql: `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        args: values,
      })
    }

    console.log(`  ${table}: 迁移 ${rows.rows.length} 行`)
  }

  console.log('迁移完成！')
  console.log('现在可以设置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN 到 .env.local 并重启服务')
}

main().catch(console.error)
