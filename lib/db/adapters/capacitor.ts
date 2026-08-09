/**
 * Android 端适配器：@capacitor-community/sqlite（真 SQLite 文件）。
 *
 * 该模块只在 Capacitor 原生环境被 client.ts 动态加载（getClient() 的 Capacitor 分支），
 * 不会被打进 Web/桌面 bundle。@capacitor-community/sqlite 8.x 的 query() 返回
 * 对象行（{ values: Record<string, unknown>[] }，列名由插件按 SQL 列/别名提供），
 * 直接以首行键作列名即可；仅当结果为空或遇到数组行（测试 Fake/旧版行为）时，
 * 才回退 columns.ts（analyzeSelect）重建列名：
 *   - SELECT * FROM <单表>        → PRAGMA table_info(<table>) 取列名（带缓存）
 *   - 显式列列表（含 AS 别名）      → 解析 select 列表，别名即列名
 *   - PRAGMA table_info(...)      → 固定列名（cid,name,type,notnull,dflt_value,pk）
 *
 * 语句路由（Android 每次调用只允许一条语句）：
 *   - SELECT / PRAGMA table_info  → query(statement, values)
 *   - INSERT/UPDATE/DELETE/REPLACE → run(statement, values)（rowsAffected = changes.changes）
 *   - 其余（DDL、PRAGMA）          → execute(statement)（无绑定参数）
 * 手动事务内一律传 transaction=false，避免嵌套事务。
 *
 * 连接生命周期：createConnection('lifeos', false, 'no-encryption', 1, false) → open()。
 * Android 端 WAL2 为默认，无需设置 journal_mode。外键按连接启用（PRAGMA foreign_keys = ON）。
 * 首启自动执行内联迁移（migrate()，幂等）。
 */
import { migrate } from '../migrate'
import { analyzeSelect, PRAGMA_TABLE_INFO_COLUMNS } from './columns'
import type { DbClient, DbExecuteParams, DbResultSet, DbTransaction, DbValue } from '../db-client'

const DB_NAME = 'lifeos'
const ENCRYPTION_MODE = 'no-encryption'

/** @capacitor-community/sqlite 8.x SQLiteDBConnection 的最小结构（便于测试注入 Fake） */
export interface NativeConnection {
  open(): Promise<void>
  close(): Promise<void>
  execute(
    statement: string,
    transaction?: boolean,
    isSQL92?: boolean
  ): Promise<CapChanges>
  run(
    statement: string,
    values?: unknown[],
    transaction?: boolean,
    returnMode?: string,
    isSQL92?: boolean
  ): Promise<CapChanges>
  /** 真机返回对象行（列名内嵌）；测试 Fake 模拟同一形态 */
  query(
    statement: string,
    values?: unknown[],
    isSQL92?: boolean
  ): Promise<{ values?: (unknown[] | Record<string, unknown>)[] }>
  beginTransaction(): Promise<unknown>
  commitTransaction(): Promise<unknown>
  rollbackTransaction(): Promise<unknown>
}

interface CapChanges {
  changes?: { changes?: number; lastId?: number }
}

/** 连接工厂注入点（测试用 Fake 替代真实插件） */
export interface CapacitorConnector {
  openConnection(): Promise<NativeConnection>
}

/** 语句路由：返回行 → query；参数化 DML → run；其余（DDL/PRAGMA）→ execute */
function routeStatement(statement: string): 'query' | 'run' | 'execute' {
  const s = statement.trim()
  const u = s.toUpperCase()
  if (u.startsWith('SELECT')) return 'query'
  if (u.startsWith('PRAGMA')) {
    if (/^PRAGMA\s+table_info\b/i.test(s)) return 'query'
    return 'execute'
  }
  if (/^(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(s)) return 'run'
  return 'execute'
}

function normalize(query: DbExecuteParams | string): { statement: string; values?: DbValue[] } {
  return typeof query === 'string' ? { statement: query } : { statement: query.sql, values: query.args }
}

/** 真实插件连接工厂（原生环境） */
async function openNativeConnection(): Promise<NativeConnection> {
  const mod = await import('@capacitor-community/sqlite')
  const { CapacitorSQLite, SQLiteConnection } = mod
  const sqlite = new SQLiteConnection(CapacitorSQLite)

  // 注意：isConnection() 只查 JS 侧 _connectionDict（web 本地注册表），检测不到
  // 原生侧残留。整页重载（如 RSC .txt 404 触发的新 JS 上下文）后，新上下文里的
  // dict 为空 → isConnection 返回 false → 但原生侧上一个上下文的连接仍存活 →
  // createConnection 抛 "Connection lifeos already exists"。因此不能只靠
  // isConnection 守卫，必须在 createConnection 失败时主动 closeConnection
  // （真正调原生、按库名关闭、跨上下文有效）后重试一次。
  async function create(): Promise<NativeConnection> {
    const conn = await sqlite.createConnection(DB_NAME, false, ENCRYPTION_MODE, 1, false)
    await conn.open()
    return conn as unknown as NativeConnection
  }

  // 上次初始化失败可能残留未关闭连接 → 先探测并关闭（JS 侧可见的部分）
  try {
    const existing = await sqlite.isConnection(DB_NAME, false)
    if (existing?.result) await sqlite.closeConnection(DB_NAME, false)
  } catch {
    /* isConnection 失败不阻塞，交由 createConnection 抛出真实错误 */
  }

  try {
    return await create()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/already exists/i.test(message)) {
      try {
        await sqlite.closeConnection(DB_NAME, false)
      } catch {
        /* 关闭失败也继续尝试重连，真实错误由下方 create 抛出 */
      }
      return await create()
    }
    throw err
  }
}

export class CapacitorDbClient implements DbClient {
  private tableCache = new Map<string, string[]>()

  constructor(private readonly conn: NativeConnection) {}

  execute(query: DbExecuteParams | string): Promise<DbResultSet> {
    const { statement, values } = normalize(query)
    return this.execRaw(statement, values, false)
  }

  async transaction(): Promise<DbTransaction> {
    await this.conn.beginTransaction()
    let finished = false
    return {
      execute: (query: DbExecuteParams | string) => {
        const { statement, values } = normalize(query)
        return this.execRaw(statement, values, true)
      },
      commit: async () => {
        if (!finished) {
          await this.conn.commitTransaction()
          finished = true
        }
      },
      rollback: async () => {
        if (!finished) {
          await this.conn.rollbackTransaction()
          finished = true
        }
      },
    }
  }

  /**
   * @param inTx 手动事务内执行时为 true（run/execute 传 transaction=false，避免嵌套事务）
   */
  private async execRaw(
    statement: string,
    values: DbValue[] | undefined,
    inTx: boolean
  ): Promise<DbResultSet> {
    const route = routeStatement(statement)
    const transaction = !inTx

    if (route === 'query') {
      const res = await this.conn.query(statement, values ?? [])
      return this.toResultSet(statement, res.values ?? [])
    }

    if (route === 'run') {
      const res = await this.conn.run(statement, values ?? [], transaction)
      return { rows: [], rowsAffected: res.changes?.changes ?? 0, columns: [] }
    }

    const res = await this.conn.execute(statement, transaction)
    return { rows: [], rowsAffected: res.changes?.changes ?? 0, columns: [] }
  }

  /** 插件返回行 → 对象行。真机为对象行（列名内嵌，直接取首行键）；
   *  数组行（测试 Fake/空结果回退）由 SQL 形态重建列名。 */
  private async toResultSet(
    statement: string,
    values: (unknown[] | Record<string, unknown>)[]
  ): Promise<DbResultSet> {
    const first = values[0]
    if (first && !Array.isArray(first)) {
      const columns = Object.keys(first)
      const rows = values.map((row) => ({ ...(row as Record<string, unknown>) })) as Record<
        string,
        DbValue
      >[]
      return { rows, rowsAffected: 0, columns }
    }
    const columns = await this.columnsFor(statement)
    const rows: Record<string, DbValue>[] = (values as unknown[][]).map((row) => {
      const obj: Record<string, DbValue> = {}
      for (let i = 0; i < columns.length; i++) obj[columns[i]] = (row[i] ?? null) as DbValue
      return obj
    })
    return { rows, rowsAffected: 0, columns }
  }

  private async columnsFor(statement: string): Promise<string[]> {
    const shape = analyzeSelect(statement)
    if (!shape) {
      throw new Error(
        `[capacitor-db] 无法解析列名的查询（仅支持 SELECT/PRAGMA table_info）：${statement.slice(0, 80)}`
      )
    }    if (shape.kind === 'pragma-table-info') return PRAGMA_TABLE_INFO_COLUMNS
    if (shape.kind === 'explicit') return shape.columns
    if (!shape.table) {
      throw new Error(`[capacitor-db] 无法确定表名：${statement.slice(0, 80)}`)
    }
    return this.tableColumns(shape.table)
  }

  /** PRAGMA table_info(<table>) 取列名（schema 首启迁移后固定，按表缓存） */
  private async tableColumns(table: string): Promise<string[]> {
    const cached = this.tableCache.get(table)
    if (cached) return cached
    const res = await this.conn.query(`PRAGMA table_info(${table})`)
    // 真机对象行取 .name；数组行（Fake）取固定下标 1
    const names = (res.values ?? []).map((row) =>
      Array.isArray(row) ? String(row[1]) : String((row as Record<string, unknown>).name)
    )
    this.tableCache.set(table, names)
    return names
  }
}

/**
 * 创建 Capacitor 适配器（单例语义由 client.ts 的 lazyFacade 保证）：
 * 打开连接 → 启用外键 → 首启自动执行内联迁移（幂等）。
 */
export async function createCapacitorDb(connector?: CapacitorConnector): Promise<DbClient> {
  const conn = connector ? await connector.openConnection() : await openNativeConnection()
  try {
    // 外键按连接启用；execute 默认包事务，PRAGMA foreign_keys 在事务内为 no-op → transaction=false
    await conn.execute('PRAGMA foreign_keys = ON', false)
    const db = new CapacitorDbClient(conn)
    await migrate(db)
    return db
  } catch (err) {
    // 初始化失败关闭连接，避免插件内残留连接导致下次 createConnection 报 already exists
    try {
      await conn.close()
    } catch {
      /* ok */
    }
    throw err
  }
}
