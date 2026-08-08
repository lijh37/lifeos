import { NextRequest, NextResponse } from 'next/server'
import { listWeightLogs, upsertWeightLog, deleteWeightLog } from '@/lib/db'
import { validateWeightInput } from '@/lib/services/weight'
import type { WeightLog, WeightPersonKey } from '@/lib/types'

/** 按 person 分组、各自按 date 升序。 */
function groupByPerson(logs: WeightLog[]): { me: WeightLog[]; her: WeightLog[] } {
  const grouped: { me: WeightLog[]; her: WeightLog[] } = { me: [], her: [] }
  for (const log of logs) {
    grouped[log.person].push(log)
  }
  return grouped
}

const GETHandler = async function GET() {
  const logs = await listWeightLogs()
  return NextResponse.json(groupByPerson(logs), {
    headers: { 'Cache-Control': 'private, max-age=20, stale-while-revalidate=90' },
  })
}

// export 构建（BUILD_TARGET=export）下 GET 置空（静态导出无服务端运行时，E301）。
// `as typeof GETHandler` 断言使 tsc 视 GET 为纯函数类型（消除 TS2722/TS18048），
// 运行时在 export 下仍为 undefined。
export const GET = (process.env.BUILD_TARGET === 'export' ? undefined : GETHandler) as typeof GETHandler

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const b = (body ?? {}) as Record<string, unknown>

  const validationError = validateWeightInput(b)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const weightLog = await upsertWeightLog({
    person: b.person as WeightPersonKey,
    date: b.date as string,
    weight: b.weight as number,
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
