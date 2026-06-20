import { NextRequest, NextResponse } from 'next/server'
import { createExpense, getExpenses, deleteExpense, initDB } from '@/lib/db'
import type { Expense } from '@/lib/types'

export async function GET(req: NextRequest) {
  await initDB()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const expenses = type && (type === 'expense' || type === 'income')
    ? await getExpenses(type)
    : await getExpenses()
  return NextResponse.json({ expenses })
}

export async function POST(req: NextRequest) {
  await initDB()
  const body = await req.json()
  const expense: Expense = {
    id: crypto.randomUUID(),
    amount: body.amount,
    category: body.category,
    description: body.description || '',
    type: body.type || 'expense',
    createdAt: body.createdAt || new Date().toISOString(),
  }
  await createExpense(expense)
  return NextResponse.json({ expense })
}

export async function DELETE(req: NextRequest) {
  await initDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteExpense(id)
  return NextResponse.json({ success: true })
}
