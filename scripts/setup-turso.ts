import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient as createDbClient } from '@libsql/client'

const ORG = process.env.TURSO_ORG || 'lijh37'
const TOKEN = process.env.TURSO_PLATFORM_TOKEN || ''
const DB_NAME = 'lifeos'
const API = 'https://api.turso.tech'

async function api(path: string, method = 'GET', body?: any) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`)
  return data
}

async function main() {
  if (!TOKEN) { console.error('请设置 TURSO_PLATFORM_TOKEN'); process.exit(1) }

  // 检查可用 locations
  console.log('检查可用 locations...')
  const locs: any = await api('/v1/locations')
  const locations = Object.keys(locs?.locations || locs || {})
  console.log(`  可用: ${locations.join(', ')}`)
  const location = locations.includes('aps1') ? 'aps1' : locations[0] || 'us-east-1'

  // 检查或创建 group
  console.log('检查 groups...')
  let groups: any
  try { groups = await api(`/v1/organizations/${ORG}/groups`) } catch {}
  const groupList = groups?.groups || []
  console.log(`  当前 groups: ${groupList.map((g: any) => g.slug || g.name).join(', ') || '无'}`)

  let groupName = 'lifeos-group'
  if (groupList.length === 0) {
    console.log(`创建 group "${groupName}"...`)
    await api(`/v1/organizations/${ORG}/groups`, 'POST', {
      name: groupName,
      location,
    })
    console.log('  ✅ Group 创建成功')
  } else {
    groupName = groupList[0].slug || groupList[0].name
    console.log(`  使用已有 group: ${groupName}`)
  }

  // 创建数据库
  console.log(`创建数据库 ${DB_NAME}...`)
  try {
    await api(`/v1/organizations/${ORG}/databases`, 'POST', {
      name: DB_NAME,
      group: groupName,
    })
    console.log('✅ 数据库创建成功')
  } catch (e: any) {
    if (e.message?.includes('already exists')) console.log('数据库已存在')
    else throw e
  }

  // 获取数据库信息
  const dbInfo: any = await api(`/v1/organizations/${ORG}/databases/${DB_NAME}`)
  const hostname = dbInfo?.database?.hostname
  const dbUrl = hostname ? `libsql://${hostname}` : `libsql://${DB_NAME}-${ORG}.turso.io`

  // 生成 Token
  console.log('生成数据库 Token...')
  const tokenData: any = await api(`/v1/organizations/${ORG}/databases/${DB_NAME}/auth/tokens`, 'POST', {
    expiration: null,
    authorization: 'read-write',
  })
  const authToken = tokenData?.jwt || tokenData?.token

  console.log('\n========================================')
  console.log('环境变量（用于 .env.local 和 Vercel）:')
  console.log('========================================')
  console.log(`TURSO_DATABASE_URL=${dbUrl}`)
  console.log(`TURSO_AUTH_TOKEN=${authToken}`)
  console.log('========================================\n')

  // 迁移数据
  console.log('迁移本地数据到 Turso...')
  const localPath = join(import.meta.dirname, '..', 'data', 'life.db')
  const local = createDbClient({ url: `file:${localPath}` })
  const remote = createDbClient({ url: dbUrl, authToken })

  const schema = readFileSync(join(import.meta.dirname, '..', 'data', 'schema.sql'), 'utf-8')
  console.log('创建表结构...')
  for (const stmt of schema.split(';').map(s => s.trim()).filter(Boolean)) {
    try { await remote.execute(stmt) }
    catch (e: any) { if (!e.message?.includes('already exists')) throw e }
  }
  console.log('✅ 表结构创建完成')

  const tables = ['notes', 'chat_messages', 'budgets', 'habits', 'habit_completions']
  for (const table of tables) {
    const rows = await local.execute(`SELECT * FROM ${table}`)
    if (rows.rows.length === 0) { console.log(`  ${table}: 无数据`); continue }
    for (const row of rows.rows) {
      const columns = Object.keys(row)
      await remote.execute({
        sql: `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        args: Object.values(row),
      })
    }
    console.log(`  ${table}: ${rows.rows.length} 行`)
  }
  console.log('\n✅ Turso 设置完成！')
}

main().catch(e => { console.error('❌ 错误:', e.message || e); process.exit(1) })
