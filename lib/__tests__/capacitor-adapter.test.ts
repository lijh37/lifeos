/**
 * capacitor 适配器测试：用 @libsql/client（文件库）实现 FakeNativeConnection，
 * 高保真模拟 @capacitor-community/sqlite 的行为（数组行、changes 结构、事务三方法），
 * 验证适配器的关键逻辑：
 *   - 首启自动迁移（内联 SQL 经适配器在真实 SQLite 上执行）
 *   - 语句路由（query / run / execute）
 *   - 数组行 → 对象行重建（star 经 PRAGMA table_info、显式列、AS 别名、聚合）
 *   - rowsAffected 映射（changes.changes）
 *   - 手动事务（begin/commit/rollback + 事务内读可见 + 外部传入事务）
 *
 * 注意：@libsql/client 的 transaction() 在 :memory: 上不可用（tx.commit() 抛错），
 * 因此本测试使用文件库（.db-capacitor-test.sqlite），与 db.test.ts 同一约定。
 */
import { beforeEach, afterAll, describe, expect, it } from 'vitest'
import { rmSync } from 'node:fs'
import { createClient, type InValue, type Transaction } from '@libsql/client'
import { createCapacitorDb, type NativeConnection } from '../db/adapters/capacitor'
import type { DbClient } from '../db/db-client'

/** 每个用例使用独立数据库文件：libsql 对同一路径的连接在文件被删后进入
 *  DBMOVED 只读坏态，且后续 createClient 可能复用坏连接 → 唯一路径根治 */
let testSeq = 0
const dbFiles: string[] = []

/** 以 @libsql/client 为后端的原生连接 Fake */
class FakeNativeConnection implements NativeConnection {
  readonly client: ReturnType<typeof createClient>
  private tx: Transaction | null = null

  constructor(path: string) {
    this.client = createClient({ url: `file:${path}` })
  }

  async open(): Promise<void> {}

  async close(): Promise<void> {
    this.client.close()
  }

  async execute(statement: string): Promise<{ changes: { changes: number } }> {
    const r = this.tx ? await this.tx.execute(statement) : await this.client.execute(statement)
    return { changes: { changes: r.rowsAffected } }
  }

  async run(statement: string, values: unknown[] = []): Promise<{ changes: { changes: number } }> {
    const r = this.tx
      ? await this.tx.execute({ sql: statement, args: values as InValue[] })
      : await this.client.execute({ sql: statement, args: values as InValue[] })
    return { changes: { changes: r.rowsAffected } }
  }

  /** 高保真模拟真机 @capacitor-community/sqlite：返回对象行（列名内嵌） */
  async query(
    statement: string,
    values: unknown[] = []
  ): Promise<{ values: Record<string, unknown>[] }> {
    const r = this.tx
      ? await this.tx.execute({ sql: statement, args: values as InValue[] })
      : await this.client.execute({ sql: statement, args: values as InValue[] })
    const rows = r.rows.map((row) => {
      const obj: Record<string, unknown> = {}
      for (const col of r.columns) {
        obj[col] = (row as unknown as Record<string, unknown>)[col]
      }
      return obj
    })
    return { values: rows }
  }

  async beginTransaction(): Promise<void> {
    this.tx = await this.client.transaction()
  }

  async commitTransaction(): Promise<void> {
    await this.tx?.commit()
    this.tx = null
  }

  async rollbackTransaction(): Promise<void> {
    await this.tx?.rollback()
    this.tx = null
  }
}

function openFake(): { openConnection: () => Promise<NativeConnection> } {
  const path = `./.db-capacitor-test-${testSeq++}.sqlite`
  dbFiles.push(path)
  const conn = new FakeNativeConnection(path)
  return { openConnection: async () => conn }
}

const TS = '2026-08-08T00:00:00Z'

describe('capacitor 适配器（libsql 后端 Fake 高保真）', () => {
  let db: DbClient
  let connector: { openConnection: () => Promise<NativeConnection> }

  beforeEach(async () => {
    // 每用例独立连接 + 独立数据库文件（固定 id 复用 + libsql 同路径连接坏态）
    connector = openFake()
    db = await createCapacitorDb(connector)
  })

  afterAll(() => {
    for (const f of dbFiles) {
      try {
        rmSync(f, { force: true })
      } catch {
        /* ignore */
      }
    }
  })

  it('首启自动迁移：8 表 + _migrations 建立，version 1/2 已应用', async () => {
    const tables = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    const names = tables.rows.map((r) => r.name)
    for (const t of [
      'notes',
      'budgets',
      'attachments',
      'habits',
      'habit_completions',
      'tags',
      'note_tags',
      'weight_logs',
      '_migrations',
    ]) {
      expect(names).toContain(t)
    }
    const mig = await db.execute('SELECT version FROM _migrations ORDER BY version')
    expect(mig.rows.map((r) => r.version)).toEqual([1, 2])
  })

  it('迁移幂等：同一连接重复 createCapacitorDb（内部 migrate）不抛错', async () => {
    await expect(createCapacitorDb(connector)).resolves.toBeDefined()
  })

  it('star 查询：经 PRAGMA table_info 重建对象行', async () => {
    await db.execute({
      sql: "INSERT INTO notes (id, content, title, type, created_at, updated_at) VALUES (?, ?, ?, 'note', ?, ?)",
      args: ['n1', 'hello', '标题', TS, TS],
    })
    const res = await db.execute({ sql: 'SELECT * FROM notes' })
    expect(res.columns).toEqual(
      expect.arrayContaining(['id', 'content', 'title', 'type', 'due_date', 'done', 'pinned'])
    )
    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].id).toBe('n1')
    expect(res.rows[0].title).toBe('标题')
    expect(res.rows[0].done).toBe(0)
  })

  it('显式列 + AS 别名查询', async () => {
    await db.execute({
      sql: "INSERT INTO habits (id, name, description, frequency, created_at) VALUES ('h1', '跑步', '', 'daily', ?)",
      args: [TS],
    })
    const res = await db.execute({ sql: 'SELECT id, name AS n, frequency FROM habits' })
    expect(res.columns).toEqual(['id', 'n', 'frequency'])
    expect(res.rows[0]).toEqual({ id: 'h1', n: '跑步', frequency: 'daily' })
  })

  it('rowsAffected 映射（run 路径）：insert/update/delete', async () => {
    const ins = await db.execute({
      sql: "INSERT INTO tags (id, name, created_at) VALUES ('t1', 'work', ?)",
      args: [TS],
    })
    expect(ins.rowsAffected).toBe(1)
    const upd = await db.execute({
      sql: 'UPDATE tags SET name = ? WHERE id = ?',
      args: ['life', 't1'],
    })
    expect(upd.rowsAffected).toBe(1)
    const del = await db.execute({ sql: 'DELETE FROM tags WHERE id = ?', args: ['t1'] })
    expect(del.rowsAffected).toBe(1)
    const miss = await db.execute({ sql: 'DELETE FROM tags WHERE id = ?', args: ['missing'] })
    expect(miss.rowsAffected).toBe(0)
  })

  it('字符串形 execute 与聚合别名（COUNT(*) as count）', async () => {
    await db.execute({
      sql: "INSERT INTO notes (id, content, type, created_at, updated_at) VALUES ('n1', 'a', 'note', ?, ?)",
      args: [TS, TS],
    })
    await db.execute({
      sql: "INSERT INTO notes (id, content, type, created_at, updated_at) VALUES ('n2', 'b', 'note', ?, ?)",
      args: [TS, TS],
    })
    const res = await db.execute('SELECT COUNT(*) as count FROM notes')
    expect(res.rows[0].count).toBe(2)
  })

  it('聚合别名查询（对应 habits dashboard：SUM(CASE WHEN...END) as week_count + JOIN + GROUP BY）', async () => {
    await db.execute({
      sql: "INSERT INTO habits (id, name, description, frequency, created_at) VALUES ('h1', 'h', '', 'daily', ?)",
      args: [TS],
    })
    await db.execute({
      sql: "INSERT INTO habit_completions (id, habit_id, date, completed, created_at) VALUES ('c1', 'h1', '2026-08-01', 1, ?)",
      args: [TS],
    })
    await db.execute({
      sql: "INSERT INTO habit_completions (id, habit_id, date, completed, created_at) VALUES ('c2', 'h1', '2026-08-02', 1, ?)",
      args: [TS],
    })
    const res = await db.execute({
      sql: `SELECT habits.id, habits.name,
        SUM(CASE WHEN date >= ? AND date <= ? THEN 1 ELSE 0 END) as week_count
        FROM habits LEFT JOIN habit_completions ON habits.id = habit_completions.habit_id
        WHERE habits.id = ? GROUP BY habits.id, habits.name`,
      args: ['2026-08-01', '2026-08-07', 'h1'],
    })
    expect(res.rows[0].week_count).toBe(2)
  })

  it('事务：rollback 丢弃、commit 持久化', async () => {
    const tx = await db.transaction()
    await tx.execute({
      sql: "INSERT INTO tags (id, name, created_at) VALUES ('t1', 'a', ?)",
      args: [TS],
    })
    await tx.rollback()
    let res = await db.execute('SELECT COUNT(*) as count FROM tags')
    expect(res.rows[0].count).toBe(0)

    const tx2 = await db.transaction()
    await tx2.execute({
      sql: "INSERT INTO tags (id, name, created_at) VALUES ('t2', 'b', ?)",
      args: [TS],
    })
    await tx2.commit()
    res = await db.execute('SELECT COUNT(*) as count FROM tags')
    expect(res.rows[0].count).toBe(1)
  })

  it('事务内读可见未提交数据（对应 syncNoteTags(noteId, tags, tx) 外部传入事务）', async () => {
    const tx = await db.transaction()
    await tx.execute({
      sql: "INSERT INTO notes (id, content, type, created_at, updated_at) VALUES ('n1', 'c', 'note', ?, ?)",
      args: [TS, TS],
    })
    const res = await tx.execute({ sql: 'SELECT id FROM notes WHERE id = ?', args: ['n1'] })
    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].id).toBe('n1')
    await tx.commit()
  })
})
