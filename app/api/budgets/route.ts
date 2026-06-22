import { NextRequest, NextResponse } from 'next/server'
import { getBudget, getBudgets, upsertBudget, initDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  await initDB()
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (month) {
    const budget = await getBudget(month)
    return NextResponse.json({ budget })
  }
  const budgets = await getBudgets()
  return NextResponse.json({ budgets })
}

export async function POST(req: NextRequest) {
  await initDB()
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
