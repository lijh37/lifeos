import { NextResponse } from 'next/server'
import { initDB, getClient } from '@/lib/db'

function db() { return getClient() }

export async function GET() {
  await initDB()
  const c = db()

  const [noteCounts, expenseMonth, expenseCat, habitRate, tagRows, recent] = await Promise.all([
    c.execute(`SELECT type, COUNT(*) as count FROM notes GROUP BY type`),
    c.execute(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE type='expense' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`),
    c.execute(`SELECT category, SUM(amount) as total FROM expenses WHERE type='expense' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') GROUP BY category ORDER BY total DESC`),
    c.execute(`SELECT COUNT(*) as done FROM habit_completions WHERE completed=1 AND date >= date('now', '-7 days')`),
    c.execute(`SELECT tags FROM notes`),
    c.execute(`
      SELECT id, 'note' as source, type, COALESCE(title, content) as title, created_at FROM notes
      UNION ALL
      SELECT id, 'expense' as source, type, description as title, created_at FROM expenses
      UNION ALL
      SELECT id, 'habit' as source, 'habit' as type, name as title, created_at FROM habits
      ORDER BY created_at DESC LIMIT 15
    `),
  ])

  let note = 0, task = 0, event = 0
  for (const r of noteCounts.rows) {
    const t = r.type as string
    const n = r.count as number
    if (t === 'note') note = n
    else if (t === 'task') task = n
    else if (t === 'event') event = n
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

  return NextResponse.json({
    counts: { note, task, event },
    expensesThisMonth: (expenseMonth.rows[0]?.total as number) || 0,
    expenseCategories: expenseCat.rows.map(r => ({
      category: r.category as string,
      total: r.total as number,
    })),
    habitCompletion7d: (habitRate.rows[0]?.done as number) || 0,
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
