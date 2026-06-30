/**
 * 一次性导入脚本：将 笔记.md 解析为笔记导入 LifeOS
 *
 * 用法：
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/import-notes-from-md.ts
 *   # 或用本地库：
 *   DATABASE_URL=file:./data/life.db npx tsx scripts/import-notes-from-md.ts
 */

import { readFileSync } from 'fs'
import { initDB } from '../lib/db'
import { genId } from '../lib/utils'
import { getClient } from '../lib/db'

const FILE_PATH = process.argv[2] || '笔记.md'

function parseDate(ts: string): string {
  const [date, time] = ts.split(' ')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss] = time.split(':').map(Number)
  return new Date(Date.UTC(y, m - 1, d, hh - 8, mm, ss)).toISOString()
}

interface RawNote { timestamp: string; title: string; content: string }

function parseNotes(text: string): RawNote[] {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const notes: RawNote[] = []

  const startRe = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\n-+\n### 标题：/g
  const starts: { index: number; timestamp: string }[] = []
  let m: RegExpExecArray | null
  while ((m = startRe.exec(text)) !== null) starts.push({ index: m.index, timestamp: m[1] })

  if (starts.length === 0) {
    console.error('❌ 未匹配到任何笔记')
    process.exit(1)
  }

  for (let i = 0; i < starts.length; i++) {
    const s = starts[i]
    const afterTs = s.index + s.timestamp.length + 1
    const dashEnd = text.indexOf('\n', afterTs) + 1
    const titleStart = dashEnd + '### 标题：'.length
    const titleEnd = text.indexOf('\n', titleStart)
    const title = text.slice(titleStart, titleEnd).trim()
    const contentStart = titleEnd + 1
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length

    let content = text.slice(contentStart, end).trim()
    content = content.replace(/^内容：/, '').trim()
    notes.push({ timestamp: s.timestamp, title, content })
  }
  return notes
}

async function main() {
  console.log(`📖 读取 ${FILE_PATH} ...`)
  const raw = readFileSync(FILE_PATH, 'utf-8')
  const parsed = parseNotes(raw)
  console.log(`📝 解析出 ${parsed.length} 条笔记\n`)

  await initDB()
  const db = getClient()

  // 检查已有笔记数（去重）
  const countRes = await db.execute('SELECT COUNT(*) FROM notes')
  const existing = Number(countRes.rows[0][0])
  console.log(`📊 数据库当前有 ${existing} 条笔记`)

  // 批量写入，每批 50 条
  const BATCH = 50
  let imported = 0
  let errors = 0

  for (let i = 0; i < parsed.length; i += BATCH) {
    const batch = parsed.slice(i, i + BATCH)
    const values = batch.map(p => {
      const now = parseDate(p.timestamp)
      return {
        id: genId(),
        content: p.content || '',
        title: p.title || null,
        type: 'note',
        tags: '[]',
        done: 0,
        createdAt: now,
        updatedAt: now,
      }
    })

    // 用逐条 INSERT（兼容 Turso 不支持批量 INSERT 的情况）
    for (const v of values) {
      try {
        await db.execute({
          sql: `INSERT INTO notes (id, content, title, type, tags, done, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [v.id, v.content, v.title, v.type, v.tags, v.done, v.createdAt, v.updatedAt],
        })
        imported++
      } catch (e: any) {
        // 如果是因为唯一约束冲突（重复导入），跳过
        if (e.message?.includes('UNIQUE')) continue
        console.error(`  ❌ 导入失败: "${v.title || '无标题'}"`, e)
        errors++
      }
    }

    console.log(`  进度: ${imported}/${parsed.length}`)
  }

  const finalRes = await db.execute('SELECT COUNT(*) FROM notes')
  const total = Number(finalRes.rows[0][0])
  console.log(`\n🎉 完成！新增 ${imported} 条（跳过 ${errors} 条失败）`)
  console.log(`📊 数据库现有 ${total} 条笔记`)
}

main().catch(console.error)
