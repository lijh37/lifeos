import type { WeightLog, WeightPersonKey } from '../types'
import { getClient } from './client'
import { genId } from '../utils'

function rowToWeightLog(row: Record<string, unknown>): WeightLog {
  return {
    id: row.id as string,
    person: row.person as WeightPersonKey,
    date: row.date as string,
    weight: row.weight as number,
    note: (row.note as string) ?? '',
    createdAt: row.created_at as string,
  }
}

/**
 * 获取全部体重记录，按人分组、日期升序排列。
 * @returns 体重记录数组
 */
export async function listWeightLogs(): Promise<WeightLog[]> {
  const db = getClient()
  const result = await db.execute('SELECT * FROM weight_logs ORDER BY person, date ASC')
  return result.rows.map(rowToWeightLog)
}

/**
 * 新增或覆盖一条体重记录（同人同日视为覆盖）。
 * @param input - 体重记录输入
 * @returns 保存后的完整体重记录
 */
export async function upsertWeightLog(input: {
  person: WeightPersonKey
  date: string
  weight: number
  note?: string
}): Promise<WeightLog> {
  const db = getClient()
  const existing = await db.execute({
    sql: 'SELECT id FROM weight_logs WHERE person = ? AND date = ?',
    args: [input.person, input.date],
  })
  const note = input.note ?? ''
  const now = new Date().toISOString()

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id as string
    await db.execute({
      sql: 'UPDATE weight_logs SET weight = ?, note = ? WHERE id = ?',
      args: [input.weight, note, id],
    })
    return {
      id,
      person: input.person,
      date: input.date,
      weight: input.weight,
      note,
      createdAt: now,
    }
  } else {
    const id = genId()
    await db.execute({
      sql: 'INSERT INTO weight_logs (id, person, date, weight, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, input.person, input.date, input.weight, note, now],
    })
    return {
      id,
      person: input.person,
      date: input.date,
      weight: input.weight,
      note,
      createdAt: now,
    }
  }
}

/**
 * 删除指定体重记录。
 * @param id - 体重记录 ID
 */
export async function deleteWeightLog(id: string): Promise<void> {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM weight_logs WHERE id = ?', args: [id] })
}
