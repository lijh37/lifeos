import { NextRequest, NextResponse } from 'next/server'
import { getBudget, getBudgets, upsertBudget } from '@/lib/db'
import { isAuthorized } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
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

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { month, fixedBudget, variableBudget, fixedActual, variableActual, notes, isCompleted, savingsCompleted } = body
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month must be in YYYY-MM format' }, { status: 400 })
  }

  // Numeric fields must be numbers (or null/undefined). Reject NaN / non-numeric.
  const numOrNull = (v: unknown): number | null | undefined => {
    if (v === undefined || v === null) return v
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
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
