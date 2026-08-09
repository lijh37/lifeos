/**
 * 数据库客户端薄接口（DbClient）
 *
 * 目标：lib/db 各模块的 SQL 语句与 lib/db/migrations.ts 内联迁移定义零改动，
 * 只新增连接器适配层。本接口只暴露 lib/db 实际用到的能力：
 *   - execute()：双形态（字符串 / { sql, args }）
 *   - transaction()：手动事务（execute / commit / rollback）
 *   - 结果集：rows（对象行）+ rowsAffected + columns
 *
 * 两个实现：
 *   - adapters/libsql.ts    —— Web/桌面（@libsql/client，本地 SQLite / Turso 远程）
 *   - adapters/capacitor.ts —— Android（capacitor-sqlite，真 SQLite 文件）
 */

/**
 * 绑定参数值类型（@libsql/client InValue 的超集，保证 InValue[] 可赋值）。
 * InValue = null|string|number|bigint|boolean|Uint8Array|ArrayBuffer|Date
 */
export type DbValue =
  | null
  | string
  | number
  | bigint
  | boolean
  | Uint8Array
  | ArrayBuffer
  | Date

export interface DbExecuteParams {
  sql: string
  args?: DbValue[]
}

export interface DbResultSet {
  /**
   * 对象行（列名 → 值）。@libsql/client 原生返回（Row 的 [name: string]: Value）；
   * capacitor 适配器由数组行重建。值类型为 DbValue，保证 lib/db 内 `row.id` 等
   * 访问可直接作为绑定参数/被显式断言，无需逐处改造。
   */
  rows: Record<string, DbValue>[]
  /** 受影响行数（DELETE/UPDATE/INSERT） */
  rowsAffected: number
  /** 列名（按查询返回顺序） */
  columns: string[]
}

export interface DbTransaction {
  execute(query: DbExecuteParams | string): Promise<DbResultSet>
  commit(): Promise<void>
  rollback(): Promise<void>
}

export interface DbClient {
  execute(query: DbExecuteParams | string): Promise<DbResultSet>
  transaction(): Promise<DbTransaction>
}
