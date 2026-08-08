/**
 * SQL 列名提取工具测试。
 * 用例覆盖 lib/db 与 app/api 中出现的全部真实查询形态。
 */
import { describe, it, expect } from 'vitest'
import {
  analyzeSelect,
  splitTopLevel,
  exprName,
  PRAGMA_TABLE_INFO_COLUMNS,
} from '@/lib/db/adapters/columns'

describe('splitTopLevel', () => {
  it('按顶层逗号切分，忽略括号内与 CASE 内逗号', () => {
    const sql = 'a, b(c, d), CASE WHEN x >= 1 THEN y ELSE z END as w, e.f'
    expect(splitTopLevel(sql)).toEqual([
      'a',
      'b(c, d)',
      'CASE WHEN x >= 1 THEN y ELSE z END as w',
      'e.f',
    ])
  })

  it('忽略字符串字面量中的逗号', () => {
    expect(splitTopLevel("a, 'x,y', b")).toEqual(["a", "'x,y'", 'b'])
  })
})

describe('exprName', () => {
  it('优先取 AS 别名', () => {
    expect(exprName('COUNT(*) as count')).toBe('count')
    expect(exprName('SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) as week_count')).toBe(
      'week_count'
    )
  })

  it('取纯标识符与去表前缀的末段', () => {
    expect(exprName('habit_id')).toBe('habit_id')
    expect(exprName('nt.note_id')).toBe('note_id')
    expect(exprName('t.name')).toBe('name')
  })

  it('无法命名时返回 null', () => {
    expect(exprName('COUNT(*)')).toBeNull()
    expect(exprName('')).toBeNull()
  })
})

describe('analyzeSelect', () => {
  it('识别 SELECT * 单表查询（含子查询/WHERE/ORDER）', () => {
    expect(analyzeSelect('SELECT * FROM notes ORDER BY pinned DESC, created_at DESC LIMIT ?')).toEqual({
      kind: 'star',
      table: 'notes',
    })
    expect(
      analyzeSelect(
        'SELECT * FROM notes WHERE (content LIKE ? OR title LIKE ?) AND id NOT IN (SELECT note_id FROM note_tags) ORDER BY created_at DESC LIMIT 50'
      )
    ).toEqual({ kind: 'star', table: 'notes' })
    expect(analyzeSelect('SELECT * FROM weight_logs ORDER BY person, date ASC')).toEqual({
      kind: 'star',
      table: 'weight_logs',
    })
  })

  it('识别显式列列表（含别名）', () => {
    expect(analyzeSelect('SELECT id, completed FROM habit_completions WHERE habit_id = ? AND date = ?')).toEqual({
      kind: 'explicit',
      columns: ['id', 'completed'],
    })
    expect(
      analyzeSelect(
        'SELECT nt.note_id, t.name FROM note_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.note_id IN (?, ?) ORDER BY t.name'
      )
    ).toEqual({ kind: 'explicit', columns: ['note_id', 'name'] })
    expect(analyzeSelect('SELECT version FROM _migrations ORDER BY version')).toEqual({
      kind: 'explicit',
      columns: ['version'],
    })
  })

  it('识别带 CASE 聚合的显式列', () => {
    expect(
      analyzeSelect(
        'SELECT habit_id, COUNT(*) as total, SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) as week_count, SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) as month_count FROM habit_completions WHERE completed = 1 GROUP BY habit_id'
      )
    ).toEqual({
      kind: 'explicit',
      columns: ['habit_id', 'total', 'week_count', 'month_count'],
    })
    expect(
      analyzeSelect(
        'SELECT t.name, COUNT(nt.note_id) as count FROM tags t LEFT JOIN note_tags nt ON t.id = nt.tag_id GROUP BY t.id ORDER BY count DESC, t.name ASC'
      )
    ).toEqual({ kind: 'explicit', columns: ['name', 'count'] })
    expect(
      analyzeSelect('SELECT COUNT(*) as count FROM notes WHERE id NOT IN (SELECT DISTINCT note_id FROM note_tags)')
    ).toEqual({ kind: 'explicit', columns: ['count'] })
  })

  it('识别 PRAGMA table_info', () => {
    expect(analyzeSelect('PRAGMA table_info(_migrations)')).toEqual({
      kind: 'pragma-table-info',
      table: '_migrations',
    })
  })

  it('非 SELECT 返回 null', () => {
    expect(analyzeSelect('CREATE TABLE IF NOT EXISTS _migrations (version INTEGER)')).toBeNull()
    expect(analyzeSelect('')).toBeNull()
  })

  it('PRAGMA table_info 固定列名顺序正确', () => {
    expect(PRAGMA_TABLE_INFO_COLUMNS).toEqual(['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk'])
  })
})
