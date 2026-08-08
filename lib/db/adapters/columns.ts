/**
 * SQL 列名提取工具（供 capacitor 适配器把数组行重建为对象行）。
 *
 * 背景：capacitor-sqlite 的 query() 返回 `{ values: any[][] }`（数组行），
 * 不含列名；而 lib/db 的 rowToXxx 期望 `Record<string, unknown>` 对象行。
 *
 * 本项目 lib/db + app/api 的查询只有两种形态，此处分别处理：
 *   1. `SELECT * FROM <单表>`（可带 WHERE/ORDER/LIMIT，无 JOIN）→ 列名需查
 *      PRAGMA table_info(<table>)（由适配器层异步完成）
 *   2. 显式列列表（可含 AS 别名、JOIN、子查询、CASE）→ 词法切分提取列名/别名
 * 另特判 `PRAGMA table_info(X)`（固定列：cid,name,type,notnull,dflt_value,pk）。
 */

/** SELECT 查询形态分析结果 */
export type SelectShape =
  | { kind: 'star'; table: string | null }
  | { kind: 'explicit'; columns: string[] }
  | { kind: 'pragma-table-info'; table: string }
  | null // 无法识别（非 SELECT / 不支持形态）

/** PRAGMA table_info 的固定列名（与 SQLite 返回顺序一致） */
export const PRAGMA_TABLE_INFO_COLUMNS = ['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk']

/**
 * 顶层分隔符切分：跟踪括号深度、字符串字面量与 CASE...END 嵌套。
 * 用于把 SELECT 列表按顶层逗号拆成独立列表达式（列内 CASE/函数调用中的逗号不会被拆开）。
 */
export function splitTopLevel(sql: string, separator = ','): string[] {
  const parts: string[] = []
  let buf = ''
  let paren = 0
  let caseDepth = 0
  let quote: string | null = null
  let i = 0

  const isWordAt = (pos: number, word: string): boolean => {
    if (pos + word.length > sql.length) return false
    const before = pos === 0 ? ' ' : sql[pos - 1]
    const after = pos + word.length >= sql.length ? ' ' : sql[pos + word.length]
    return (
      sql.slice(pos, pos + word.length).toUpperCase() === word &&
      !/[A-Za-z0-9_$]/.test(before) &&
      !/[A-Za-z0-9_$]/.test(after)
    )
  }

  while (i < sql.length) {
    const ch = sql[i]
    if (quote) {
      buf += ch
      if (ch === quote) {
        // SQL 字符串内单引号用 '' 转义
        if (sql[i + 1] === quote) {
          buf += sql[i + 1]
          i += 2
          continue
        }
        quote = null
      }
      i++
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      buf += ch
      i++
      continue
    }
    if (ch === '(') {
      paren++
      buf += ch
      i++
      continue
    }
    if (ch === ')') {
      paren = Math.max(0, paren - 1)
      buf += ch
      i++
      continue
    }
    if (isWordAt(i, 'CASE')) {
      caseDepth++
      buf += ch
      i++
      continue
    }
    if (isWordAt(i, 'END')) {
      caseDepth = Math.max(0, caseDepth - 1)
      buf += 'END'
      i += 3
      continue
    }
    if (ch === separator && paren === 0 && caseDepth === 0) {
      parts.push(buf.trim())
      buf = ''
      i++
      continue
    }
    buf += ch
    i++
  }
  if (buf.trim()) parts.push(buf.trim())
  return parts
}

/**
 * 列表达式 → 列名：
 * 取 AS 别名；否则取纯标识符本身；否则取点号分隔的末段（去表前缀，如 `t.name` → `name`）。
 * 无法命名（未别名的函数/复杂表达式）时返回 null，调用方据此报错兜底。
 */
export function exprName(expr: string): string | null {
  const trimmed = expr.trim()
  if (!trimmed) return null

  const asMatch = trimmed.match(/\s+AS\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i)
  if (asMatch) return asMatch[1]

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) return trimmed

  const dotted = trimmed.match(/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/)
  if (dotted) return dotted[0].split('.')[1]

  return null
}

/**
 * 分析 SELECT 语句形态，提取列名或标记需要查表元数据的形态。
 * 返回 null 表示无法识别（非 SELECT / 含无法命名的表达式）。
 */
export function analyzeSelect(sql: string): SelectShape {
  const s = sql.trim()

  const pragmaMatch = s.match(/^PRAGMA\s+table_info\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/i)
  if (pragmaMatch) return { kind: 'pragma-table-info', table: pragmaMatch[1] }

  // 惰性匹配首个 FROM（本项目 SELECT 列表内不含 FROM 关键字）
  const m = s.match(
    /^SELECT\s+([\s\S]+?)\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*(?:\s+(?:AS\s+)?[A-Za-z_][A-Za-z0-9_]*)?)/i
  )
  if (!m) return null

  const selectList = m[1]
  if (/^\*\s*$/.test(selectList)) {
    return { kind: 'star', table: m[2].split(/\s+/)[0] }
  }

  const columns: string[] = []
  for (const part of splitTopLevel(selectList)) {
    const name = exprName(part)
    if (name === null) return null
    columns.push(name)
  }
  return { kind: 'explicit', columns }
}
