import { NextRequest, NextResponse } from 'next/server'
import { getBudget, getBudgets, upsertBudget } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const cacheHeaders = { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } }
  if (month) {
    const budget = await getBudget(month)
    return NextResponse.json({ budget }, cacheHeaders)
  }
  const budgets = await getBudgets()
  return NextResponse.json({ budgets }, cacheHeaders)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { month, fixedBudget, variableBudget, fixedActual, variableActual, notes, isCompleted, savingsCompleted } = body
  if (!month) {
    return NextResponse.json({ error: 'Missing month' }, { status: 400 })
  }
  const budget = await upsertBudget(month, {
    fixedBudget,
    variableBudget,
    fixedActual,
    variableActual,
    notes,
    isCompleted,
    savingsCompleted,
  })
  return NextResponse.json({ budget })
}
