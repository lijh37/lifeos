import { NextRequest, NextResponse } from 'next/server'
import { getBudget, getBudgets, upsertBudget } from '@/lib/db'
import { validateBudgetInput, numOrNull } from '@/lib/services/budgets'

const GETHandler = async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const cacheHeaders = { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } }
  if (month) {
    const budget = await getBudget(month)
    return NextResponse.json({ budget }, cacheHeaders)
  }
  const budgets = await getBudgets()
  return NextResponse.json({ budgets }, cacheHeaders)
}

// export 构建（BUILD_TARGET=export）下 GET 置空（静态导出无服务端运行时，E301）。
// `as typeof GETHandler` 断言使 tsc 视 GET 为纯函数类型（消除 TS2722/TS18048），
// 运行时在 export 下仍为 undefined。
export const GET = (process.env.BUILD_TARGET === 'export' ? undefined : GETHandler) as typeof GETHandler

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { month, fixedBudget, variableBudget, fixedActual, variableActual, notes, isCompleted, savingsCompleted } = body

  const validationError = validateBudgetInput(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const fixedBudgetN = numOrNull(fixedBudget)
  const variableBudgetN = numOrNull(variableBudget)
  const fixedActualN = numOrNull(fixedActual)
  const variableActualN = numOrNull(variableActual)
  if (fixedBudget !== undefined && fixedBudgetN === undefined ||
      variableBudget !== undefined && variableBudgetN === undefined ||
      fixedActual !== undefined && fixedActualN === undefined ||
      variableActual !== undefined && variableActualN === undefined) {
    return NextResponse.json({ error: 'budget amounts must be numbers' }, { status: 400 })
  }
  if (notes !== undefined && typeof notes !== 'string') {
    return NextResponse.json({ error: 'notes must be a string' }, { status: 400 })
  }

  const budget = await upsertBudget(month, {
    fixedBudget: fixedBudgetN ?? undefined,
    variableBudget: variableBudgetN ?? undefined,
    fixedActual: fixedActualN ?? undefined,
    variableActual: variableActualN ?? undefined,
    notes: typeof notes === 'string' ? notes : undefined,
    isCompleted,
    savingsCompleted,
  })
  return NextResponse.json({ budget })
}
