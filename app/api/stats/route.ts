import { NextResponse } from 'next/server'
import { initDB, getClient } from '@/lib/db'

function db() { return getClient() }

export async function GET() {
  await initDB()
  const c = db()

  const [noteCounts, budgetData, habitRate, tagRows, recent, habitTrend, habitTotal] = await Promise.all([
    c.execute(`SELECT type, COUNT(*) as count FROM notes GROUP BY type`),
    c.execute(`SELECT * FROM budgets ORDER BY month DESC LIMIT 1`),
    c.execute(`SELECT COUNT(*) as done FROM habit_completions WHERE completed=1 AND date >= date('now', '-7 days')`),
    c.execute(`SELECT tags FROM notes`),
    c.execute(`
      SELECT id, 'note' as source, type, COALESCE(title, content) as title, created_at FROM notes
      UNION ALL
      SELECT id, 'habit' as source, 'habit' as type, name as title, created_at FROM habits
      ORDER BY created_at DESC LIMIT 15
    `),
    c.execute(`SELECT date, COUNT(*) as count FROM habit_completions WHERE completed=1 AND date >= date('now', '-30 days') GROUP BY date ORDER BY date ASC`),
    c.execute(`SELECT COUNT(*) as count FROM habit_completions WHERE completed=1`),
  ])

  let note = 0
  for (const r of noteCounts.rows) {
    const t = r.type as string
    const n = r.count as number
    if (t === 'note') note = n
  }

  const topTags: Record<string, number> = {}
  for (const r of tagRows.rows) {
    const tags = JSON.parse(r.tags as string) as string[]
    for (const tag of tags) {
      if (tag) topTags[tag] = (topTags[tag] || 0) + 1
    }
  }
  const sortedTags = Object.entries(topTags)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const currentBudget = budgetData.rows[0] ? {
    month: budgetData.rows[0].month as string,
    fixedBudget: budgetData.rows[0].fixed_budget as number,
    variableBudget: budgetData.rows[0].variable_budget as number,
    fixedActual: budgetData.rows[0].fixed_actual as number | null,
    variableActual: budgetData.rows[0].variable_actual as number | null,
    isCompleted: (budgetData.rows[0].is_completed as number) === 1,
  } : null

  return NextResponse.json({
    counts: { note },
    currentBudget,
    habitCompletion7d: (habitRate.rows[0]?.done as number) || 0,
    habitTrend: habitTrend.rows.map(r => ({
      date: r.date as string,
      count: r.count as number,
    })),
    habitTotalCompletions: (habitTotal.rows[0]?.count as number) || 0,
    topTags: sortedTags,
    recentItems: recent.rows.map(r => ({
      id: r.id as string,
      source: r.source as string,
      type: r.type as string,
      title: r.title as string,
      createdAt: r.created_at as string,
    })),
  })
}
