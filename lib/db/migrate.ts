/**
 * 迁移执行器：启动即幂等重跑（自愈）
 *
 * 新机制：无版本簿记、无 _migrations 追踪表。
 *   - ensureSchema()：逐条重放幂等终态 DDL（CREATE TABLE/INDEX IF NOT EXISTS）
 *   - ensureColumn()：守卫式 ALTER——PRAGMA table_info 探测列，缺失才 ADD COLUMN
 * 每次启动（web/移动端/CLI/测试）调用 migrate() 组合两者，已存在的结构零改动。
 * 兼容 SQLite（:memory: / 文件）、Turso（libSQL 云端）与 capacitor-sqlite（Android）。
 */
import type { DbClient } from './db-client'
import { SCHEMA_STATEMENTS, COLUMN_MIGRATIONS } from './migrations'
import type { ColumnMigration } from './migrations'

/** 幂等重放全部终态 DDL（CREATE TABLE/INDEX IF NOT EXISTS） */
export async function ensureSchema(db: DbClient): Promise<void> {
  for (const stmt of SCHEMA_STATEMENTS) {
    await db.execute(stmt)
  }
}

/** 守卫式列迁移：目标列不存在时才执行 ALTER TABLE ... ADD COLUMN（幂等自愈） */
export async function ensureColumn(db: DbClient, spec: ColumnMigration): Promise<void> {
  const cols = await db.execute(`PRAGMA table_info(${spec.table})`)
  if (cols.rows.some((row) => row.name === spec.column)) return
  await db.execute(`ALTER TABLE ${spec.table} ADD COLUMN ${spec.ddl}`)
}

/** 组合入口：ensureSchema + 全部 COLUMN_MIGRATIONS（调用点依赖此名字） */
export async function migrate(db: DbClient): Promise<void> {
  await ensureSchema(db)
  for (const c of COLUMN_MIGRATIONS) {
    await ensureColumn(db, c)
  }
}
