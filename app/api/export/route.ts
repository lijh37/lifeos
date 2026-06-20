import { NextRequest } from 'next/server'
import { getNotes, getExpenses, initDB } from '@/lib/db'
import type { Note, Expense } from '@/lib/types'

function notesToMarkdown(notes: Note[]): string {
  const lines: string[] = []
  lines.push('# LifeOS 笔记导出')
  lines.push('')
  lines.push(`导出时间: ${new Date().toISOString()}`)
  lines.push(`总计: ${notes.length} 条`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const note of notes) {
    const typeLabel: Record<string, string> = { note: '笔记', task: '任务', event: '事件' }
    lines.push(`## ${note.title || '无标题'}`)
    lines.push(`- **类型**: ${typeLabel[note.type] || note.type}`)
    lines.push(`- **时间**: ${note.createdAt}`)
    if (note.dueDate) lines.push(`- **截止**: ${note.dueDate}`)
    if (note.tags.length > 0) lines.push(`- **标签**: ${note.tags.join(', ')}`)
    if (note.type === 'task') lines.push(`- **状态**: ${note.done ? '已完成' : '未完成'}`)
    lines.push('')
    lines.push(`> ${note.content}`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

function expensesToMarkdown(expenses: Expense[]): string {
  const lines: string[] = []
  lines.push('# LifeOS 收支导出')
  lines.push('')
  lines.push(`导出时间: ${new Date().toISOString()}`)
  lines.push(`总计: ${expenses.length} 条`)
  lines.push('')
  lines.push('---')
  lines.push('')

  const totalExpense = expenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const totalIncome = expenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  lines.push(`**总支出**: ¥${totalExpense.toFixed(2)}`)
  lines.push(`**总收入**: ¥${totalIncome.toFixed(2)}`)
  lines.push(`**净收支**: ¥${(totalIncome - totalExpense).toFixed(2)}`)
  lines.push('')

  for (const exp of expenses) {
    const sign = exp.type === 'expense' ? '-' : '+'
    lines.push(`- [${sign}¥${exp.amount.toFixed(2)}] ${exp.description || exp.category}`)
    lines.push(`  - 分类: ${exp.category} | 时间: ${exp.createdAt}`)
  }

  lines.push('')
  return lines.join('\n')
}

function toJSON(notes: Note[], expenses: Expense[]): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    notes,
    expenses,
  }, null, 2)
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function toCSV(notes: Note[], expenses: Expense[]): string {
  const lines: string[] = []
  // BOM for Excel Chinese support
  lines.push('\uFEFF')

  if (notes.length > 0) {
    lines.push('类型,标题,内容,标签,截止日期,完成,创建时间')
    for (const n of notes) {
      const typeLabel: Record<string, string> = { note: '笔记', task: '任务', event: '事件' }
      lines.push([
        escapeCSV(typeLabel[n.type] || n.type),
        escapeCSV(n.title || ''),
        escapeCSV(n.content),
        escapeCSV(n.tags.join('; ')),
        escapeCSV(n.dueDate || ''),
        n.done ? '是' : '否',
        escapeCSV(n.createdAt),
      ].join(','))
    }
    lines.push('')
  }

  if (expenses.length > 0) {
    lines.push('类型,金额,分类,描述,创建时间')
    for (const e of expenses) {
      const typeLabel = e.type === 'expense' ? '支出' : '收入'
      lines.push([
        typeLabel,
        e.amount.toFixed(2),
        escapeCSV(e.category),
        escapeCSV(e.description),
        escapeCSV(e.createdAt),
      ].join(','))
    }
  }

  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  await initDB()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'all'
  const format = searchParams.get('format') || 'md'

  const notes = type === 'all' || type === 'notes' ? await getNotes() : []
  const expenses = type === 'all' || type === 'expenses' ? await getExpenses() : []

  let content: string
  let filename: string
  let contentType: string

  if (format === 'json') {
    content = toJSON(notes, expenses)
    filename = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`
    contentType = 'application/json'
  } else if (format === 'csv') {
    content = toCSV(notes, expenses)
    filename = `lifeos-export-${new Date().toISOString().slice(0, 10)}.csv`
    contentType = 'text/csv; charset=utf-8'
  } else {
    const mdParts: string[] = []
    if (notes.length > 0) mdParts.push(notesToMarkdown(notes))
    if (expenses.length > 0) mdParts.push(expensesToMarkdown(expenses))
    content = mdParts.join('\n\n') || '没有数据'
    filename = `lifeos-export-${new Date().toISOString().slice(0, 10)}.md`
    contentType = 'text/markdown'
  }

  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
