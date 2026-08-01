import { NextRequest, NextResponse } from 'next/server'
import { listWeightLogs, upsertWeightLog, deleteWeightLog } from '@/lib/db'
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

/** 按 person 分组、各自按 date 升序。 */
function groupByPerson(logs: WeightLog[]): { me: WeightLog[]; her: WeightLog[] } {
  const grouped: { me: WeightLog[]; her: WeightLog[] } = { me: [], her: [] }
  for (const log of logs) {
    grouped[log.person].push(log)
  }
  return grouped
}

export async function GET() {
  const logs = await listWeightLogs()
  return NextResponse.json(groupByPerson(logs), {
    headers: { 'Cache-Control': 'private, max-age=20, stale-while-revalidate=90' },
  })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const b = (body ?? {}) as Record<string, unknown>

  if (!isWeightPersonKey(b.person)) {
    return NextResponse.json({ error: 'invalid person' }, { status: 400 })
  }
  if (typeof b.date !== 'string' || !isValidDate(b.date)) {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 })
  }
  if (!isValidWeight(b.weight)) {
    return NextResponse.json({ error: 'invalid weight' }, { status: 400 })
  }

  const weightLog = await upsertWeightLog({
    person: b.person,
    date: b.date,
    weight: b.weight,
    note: typeof b.note === 'string' ? b.note : '',
  })
  return NextResponse.json({ weightLog })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteWeightLog(id)
  return NextResponse.json({ success: true })
}
