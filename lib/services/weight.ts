/**
 * 体重服务（lib/services 环境分流层）
 *
 * - Capacitor 原生：直接调用 lib/db 模块（fetch 分支复刻 app/api/weight/route.ts 的 groupByPerson）
 * - Web / 测试：fetch('/api/weight') 透传，调用形状与现有组件/API route 逐字一致
 */

import { isNativeCapacitor } from './env'
import { WEIGHT_PERSONS, type WeightLog, type WeightPersonKey } from '@/lib/types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 校验日期字符串为合法真实日期（YYYY-MM-DD）。 */
function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  )
}

function isWeightPersonKey(v: unknown): v is WeightPersonKey {
  return WEIGHT_PERSONS.some(p => p.key === v)
}

/** 校验 weight 为有限数值且 > 0 且 ≤ 500。 */
function isValidWeight(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 500
}

/** 按 person 分组（仿 app/api/weight/route.ts groupByPerson）。 */
function groupByPerson(logs: WeightLog[]): { me: WeightLog[]; her: WeightLog[] } {
  const grouped: { me: WeightLog[]; her: WeightLog[] } = { me: [], her: [] }
  for (const log of logs) {
    grouped[log.person].push(log)
  }
  return grouped
}

/** 读取响应体 error 并抛出统一错误（web 分支共用） */
async function throwHttpError(res: Response): Promise<never> {
  const body = await res.json().catch(() => null)
  throw new Error(body?.error || `HTTP ${res.status}`)
}

export async function fetchWeightData(): Promise<{ me: WeightLog[]; her: WeightLog[] }> {
  if (isNativeCapacitor()) {
    const { listWeightLogs } = await import('@/lib/db/native')
    const logs = await listWeightLogs()
    return groupByPerson(logs)
  }

  const res = await fetch('/api/weight', { cache: 'no-store' })
  if (!res.ok) await throwHttpError(res)
  return res.json()
}

export interface SaveWeightInput {
  person: WeightPersonKey
  date: string
  weight: number
  note?: string
}

export async function saveWeightLog(input: SaveWeightInput): Promise<WeightLog> {
  if (isNativeCapacitor()) {
    const { upsertWeightLog } = await import('@/lib/db/native')
    return upsertWeightLog(input)
  }

  const res = await fetch('/api/weight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) await throwHttpError(res)
  const data = await res.json()
  return data.weightLog
}

export async function deleteWeightLog(id: string): Promise<void> {
  if (isNativeCapacitor()) {
    const { deleteWeightLog: dbDeleteWeightLog } = await import('@/lib/db/native')
    return dbDeleteWeightLog(id)
  }

  const res = await fetch(`/api/weight?id=${id}`, { method: 'DELETE' })
  if (!res.ok) await throwHttpError(res)
}

// ─── 校验函数（错误消息与 app/api/weight/route.ts POST 逐字一致）───

export function validateWeightInput(body: Record<string, unknown>): string | null {
  if (!isWeightPersonKey(body.person)) return 'invalid person'
  if (typeof body.date !== 'string' || !isValidDate(body.date)) return 'invalid date'
  if (!isValidWeight(body.weight)) return 'invalid weight'
  return null
}
