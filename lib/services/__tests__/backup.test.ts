/**
 * backup 服务 cap 分支测试（Capacitor 原生路径，注入真实 libsql 文件库）
 *
 * 注入方式（最高保真）：
 *   - vi.mock('@/lib/services/env')      → isNativeCapacitor() 恒真，强制走 cap 分支
 *   - vi.mock('@/lib/db/client')         → getClient() 返回测试注入的真实 libsql 文件库
 *   - 业务模块（notes/budgets/habits）与 backup.ts cap 分支经 @/lib/db 动态导入后
 *     内部 getClient() 均命中注入连接 → 真实 SQL 全链路执行于真实 SQLite。
 *
 * 覆盖（对齐 OFFLINE_PLAN §8 阶段 4）：
 *   - 导出组装：4 表数据 + habit_completions/weight_logs 直查列映射与 API route 一致
 *   - 导入成功：清空顺序、重灌 id 保留、tags 按名重建、imported 计数
 *   - 导入失败：事务中途抛错 → rollback 丢弃，原数据保留
 *   - 输入校验：无 version / notes 非数组 → 抛 '无效的备份文件'
 *
 * 注意：每用例使用唯一临时库文件（libsql 同路径连接删库后进入只读坏态）。
 */
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest'
import { rmSync } from 'node:fs'
import { createClient } from '@libsql/client'
import type { DbClient } from '@/lib/db/db-client'
import { migrate } from '@/lib/db/migrate'
import {
  createNote,
  createHabit,
  toggleCompletion,
  upsertBudget,
  upsertWeightLog,
  getNotes,
  getHabits,
  listWeightLogs,
} from '@/lib/db'
import {
  exportBackupData,
  importBackupData,
  validateBackup,
  type BackupFile,
} from '@/lib/services/backup'
import type { Note } from '@/lib/types'

// ─── mock 注入（vi.mock 工厂被提升，须用 vi.hoisted 承载可变连接） ───────────
const dbHolder = vi.hoisted(() => ({ db: null as DbClient | null }))

vi.mock('@/lib/services/env', () => ({
  isNativeCapacitor: () => true,
}))

vi.mock('@/lib/db/client', () => ({
  getClient: () => {
    if (!dbHolder.db) throw new Error('[test] db 未注入')
    return dbHolder.db
  },
  registerAdapter: vi.fn(),
}))

// ─── 唯一临时库文件（libsql 同路径删库 → SQLITE_READONLY_DBMOVED 坏态） ───────
let testSeq = 0
const dbFiles: string[] = []

function openFileDb(): DbClient {
  const path = `./.db-backup-test-${testSeq++}.sqlite`
  dbFiles.push(path)
  const raw = createClient({ url: `file:${path}` })
  return raw as unknown as DbClient
}

const TS = '2026-08-08T00:00:00Z'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    content: '旧笔记内容',
    title: '旧标题',
    type: 'note',
    tags: [],
    dueDate: null,
    done: false,
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
    pinned: overrides.pinned ?? false,
  }
}

/** 与 GET /api/backup 导出结构一致的备份文件（camelCase 字段，与 route GET 输出一致） */
function makeBackup(): BackupFile {
  return {
    version: '1',
    notes: [
      {
        id: 'n1',
        content: '内容一',
        title: '标题一',
        type: 'note',
        tags: ['工作', '生活'],
        dueDate: null,
        done: false,
        pinned: false,
        createdAt: TS,
        updatedAt: TS,
      },
      {
        id: 'n2',
        content: '内容二',
        title: null,
        type: 'note',
        tags: [],
        dueDate: '2026-09-01',
        done: true,
        pinned: true,
        createdAt: TS,
        updatedAt: TS,
      },
    ],
    budgets: [
      {
        month: '2026-08',
        fixedBudget: 1000,
        variableBudget: 500,
        fixedActual: 800,
        variableActual: 300,
        notes: '预算备注',
        isCompleted: false,
        savingsCompleted: false,
      },
    ],
    habits: [{ id: 'h1', name: '跑步', description: '', frequency: 'daily', createdAt: TS }],
    habitCompletions: [{ id: 'c1', habit_id: 'h1', date: '2026-08-01', completed: true, created_at: TS }],
    weightLogs: [{ id: 'w1', person: 'me', date: '2026-08-01', weight: 72.5, note: '', created_at: TS }],
  }
}

describe('backup cap 分支（Capacitor 原生直查 SQLite）', () => {
  beforeEach(async () => {
    dbHolder.db = openFileDb()
    await migrate(dbHolder.db)
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

  it('导出：4 表组装 + habit_completions/weight_logs 列映射与 API route GET 一致', async () => {
    // 真实业务函数造数据（含 tags 规范化、习惯打卡、体重）
    await createNote(
      makeNote({ id: 'n1', content: '内容一', title: '标题一', tags: ['工作', '生活'] })
    )
    await upsertBudget('2026-08', {
      fixedBudget: 1000,
      variableBudget: 500,
      fixedActual: 800,
      variableActual: 300,
      notes: '预算备注',
    })
    await createHabit({ id: 'h1', name: '跑步', description: '', frequency: 'daily', createdAt: TS })
    await toggleCompletion('h1', '2026-08-01')
    await upsertWeightLog({ person: 'me', date: '2026-08-01', weight: 72.5, note: '' })

    const data = await exportBackupData()

    expect(data.version).toBe('1')
    expect(data.notes).toHaveLength(1)
    expect(data.notes[0]).toMatchObject({ id: 'n1', title: '标题一' })
    expect((data.notes[0] as Note).tags).toEqual(['工作', '生活'])
    expect(data.budgets).toHaveLength(1)
    expect(data.budgets![0]).toMatchObject({ month: '2026-08', fixedBudget: 1000 })
    expect(data.habits).toHaveLength(1)
    expect(data.habits![0]).toMatchObject({ id: 'h1', name: '跑步' })

    // habit_completions 列映射：id/habit_id/date/completed(布尔化)/created_at
    expect(data.habitCompletions).toHaveLength(1)
    expect(data.habitCompletions![0]).toEqual({
      id: expect.any(String),
      habit_id: 'h1',
      date: '2026-08-01',
      completed: true,
      created_at: expect.any(String),
    })
    // weight_logs 列映射：id/person/date/weight(Number)/note/created_at
    expect(data.weightLogs).toHaveLength(1)
    expect(data.weightLogs![0]).toEqual({
      id: expect.any(String),
      person: 'me',
      date: '2026-08-01',
      weight: 72.5,
      note: '',
      created_at: expect.any(String),
    })
  })

  it('导入：空库全量恢复，id 保留 + tags 按名重建 + imported 计数', async () => {
    const result = await importBackupData(makeBackup())

    expect(result).toEqual({ success: true, imported: 6 }) // 2 notes + 1 budget + 1 habit + 1 completion + 1 weight

    // notes 保留原 id + 字段
    const notes = await getNotes(Number.MAX_SAFE_INTEGER)
    expect(notes).toHaveLength(2)
    const n1 = notes.find((n) => n.id === 'n1')!
    expect(n1).toMatchObject({ title: '标题一', done: false, pinned: false })
    expect(n1.tags).toEqual(['工作', '生活'])
    const n2 = notes.find((n) => n.id === 'n2')!
    expect(n2).toMatchObject({ title: null, done: true, pinned: true, dueDate: '2026-09-01' })

    // budgets 按 month 重建（新 UUID id）
    const budgets = await dbHolder.db!.execute("SELECT month, fixed_budget, variable_budget FROM budgets")
    expect(budgets.rows).toEqual([
      { month: '2026-08', fixed_budget: 1000, variable_budget: 500 },
    ])

    // habits / completions / weight 保留原 id
    const habits = await getHabits()
    expect(habits).toHaveLength(1)
    expect(habits[0]).toMatchObject({ id: 'h1', name: '跑步' })
    const completions = await dbHolder.db!.execute(
      "SELECT id, habit_id, date, completed FROM habit_completions"
    )
    expect(completions.rows).toEqual([{ id: 'c1', habit_id: 'h1', date: '2026-08-01', completed: 1 }])
    const weights = await listWeightLogs()
    expect(weights).toHaveLength(1)
    expect(weights[0]).toMatchObject({ id: 'w1', person: 'me', weight: 72.5 })
  })

  it('导入：清空现有数据后按 FK 安全顺序重灌（旧数据被替换）', async () => {
    // 预置旧数据（含旧标签）
    await createNote(makeNote({ id: 'old-note', content: '旧笔记', tags: ['旧标签'] }))
    await upsertBudget('2026-07', { fixedBudget: 1 })

    await importBackupData(makeBackup())

    // 旧笔记/旧预算/旧标签全部被清空替换
    const notes = await getNotes(Number.MAX_SAFE_INTEGER)
    expect(notes.map((n) => n.id).sort()).toEqual(['n1', 'n2'])
    expect(notes.every((n) => !n.tags.includes('旧标签'))).toBe(true)
    const budgets = await dbHolder.db!.execute('SELECT month FROM budgets')
    expect(budgets.rows.map((r) => r.month)).toEqual(['2026-08'])
    const tags = await dbHolder.db!.execute('SELECT name FROM tags')
    expect(tags.rows.map((r) => r.name).sort()).toEqual(['工作', '生活'])
  })

  it('导入失败：事务中途抛错 → rollback，原数据保留', async () => {
    await createNote(makeNote({ id: 'keep-me', content: '保留' }))

    // 构造重复 note id → 第二个 INSERT 违反主键 → 事务回滚
    const bad = makeBackup()
    bad.notes = [
      { ...(bad.notes[0] as Record<string, unknown>), id: 'dup' },
      { ...(bad.notes[1] as Record<string, unknown>), id: 'dup' },
    ]

    await expect(importBackupData(bad)).rejects.toThrow()

    // rollback 后：原笔记保留，导入数据未落库
    const notes = await getNotes(Number.MAX_SAFE_INTEGER)
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe('keep-me')
    expect(notes[0].content).toBe('保留')
    const budgets = await dbHolder.db!.execute('SELECT month FROM budgets')
    expect(budgets.rows).toHaveLength(0)
  })

  it('输入校验：缺 version / notes 非数组 → 抛 无效的备份文件', async () => {
    await expect(importBackupData({ notes: [] } as unknown as BackupFile)).rejects.toThrow(
      '无效的备份文件'
    )
    await expect(
      importBackupData({ version: '1', notes: 'not-array' } as unknown as BackupFile)
    ).rejects.toThrow('无效的备份文件')
  })

  it('validateBackup：非法备份返回错误消息（与 API route 一致）', () => {
    expect(validateBackup({ version: '1', notes: 'x' } as unknown as BackupFile)).toBe(
      '无效的备份文件：notes 必须是数组'
    )
    expect(
      validateBackup({ version: '1', notes: [{ content: '缺 id' }] } as unknown as BackupFile)
    ).toBe('无效的备份文件：notes[].id 必须是字符串')
    expect(
      validateBackup({
        version: '1',
        notes: [{ id: 'n1', content: 'x' }],
        habits: [{ name: '缺 id' }],
      } as unknown as BackupFile)
    ).toBe('无效的备份文件：habits[].id 必须是字符串')
    expect(
      validateBackup({
        version: '1',
        notes: [{ id: 'n1', content: 'x' }],
        weightLogs: [{ id: 'w1', person: 'me' }],
      } as unknown as BackupFile)
    ).toBe('无效的备份文件：weightLogs[].date 必须是字符串')
    expect(validateBackup(makeBackup())).toBeNull()
  })
})
