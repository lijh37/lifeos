import { NextRequest } from 'next/server'
import { getNotes, getBudgets, initDB } from '@/lib/db'
import type { Note, Budget } from '@/lib/types'

function toBeijingTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(/\//g, '-')
}

function notesToMarkdown(notes: Note[]): string {
  const lines: string[] = []
  const now = toBeijingTime(new Date().toISOString())

  lines.push('# LifeOS 笔记导出')
  lines.push('')
  lines.push(`导出时间: ${now} · 共 ${notes.length} 条`)
  lines.push('')

  for (const note of notes) {
    lines.push('---')
    lines.push('')

    // 标题行
    lines.push(`## 标题：${note.title || '无标题'}`)
    lines.push('')

    // 元信息
    const meta: string[] = [`创建: ${toBeijingTime(note.createdAt)}`, `更新: ${toBeijingTime(note.updatedAt)}`]
    if (note.tags.length > 0) meta.push(`标签: ${note.tags.join('、')}`)
    if (note.dueDate) meta.push(`截止: ${note.dueDate.slice(0, 10)}`)
    lines.push(meta.join(' · '))
    lines.push('')

    // 正文（将内容中的 --- 转为 <hr>，避免破坏文档结构）
    if (note.content) {
      lines.push(note.content.replace(/^---\s*$/gm, '<hr>'))
    }

    lines.push('')
  }

  lines.push('---')
  lines.push('')

  return lines.join('\n')
}

function budgetsToMarkdown(budgets: Budget[]): string {
  const lines: string[] = []
  lines.push('# LifeOS 预算导出')
  lines.push('')
  lines.push(`导出时间: ${new Date().toISOString()}`)
  lines.push(`总计: ${budgets.length} 个月`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const b of budgets) {
    lines.push(`## ${b.month}`)
    lines.push(`- **固定预算**: ¥${b.fixedBudget.toFixed(2)}`)
    lines.push(`- **浮动预算**: ¥${b.variableBudget.toFixed(2)}`)
    if (b.fixedActual !== null) lines.push(`- **固定实际**: ¥${b.fixedActual.toFixed(2)}`)
    if (b.variableActual !== null) lines.push(`- **浮动实际**: ¥${b.variableActual.toFixed(2)}`)
    lines.push(`- **完成月任务**: ${b.isCompleted ? '是' : '否'}`)
    lines.push(`- **完成存储**: ${b.savingsCompleted ? '是' : '否'}`)
    if (b.notes) lines.push(`- **备注**: ${b.notes}`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

function toJSON(notes: Note[], budgets: Budget[]): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    notes,
    budgets,
  }, null, 2)
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function toCSV(notes: Note[], budgets: Budget[]): string {
  const lines: string[] = []
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

  if (budgets.length > 0) {
    lines.push('月份,固定预算,浮动预算,固定实际,浮动实际,完成月任务,完成存储,备注')
    for (const b of budgets) {
      lines.push([
        escapeCSV(b.month),
        b.fixedBudget.toFixed(2),
        b.variableBudget.toFixed(2),
        b.fixedActual !== null ? b.fixedActual.toFixed(2) : '',
        b.variableActual !== null ? b.variableActual.toFixed(2) : '',
        b.isCompleted ? '是' : '否',
        b.savingsCompleted ? '是' : '否',
        escapeCSV(b.notes),
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

  const notes = type === 'all' || type === 'notes' ? await getNotes(undefined, 1000) : []
  const budgets = type === 'all' || type === 'budgets' ? await getBudgets() : []

  let content: string
  let filename: string
  let contentType: string

  if (format === 'json') {
    content = toJSON(notes, budgets)
    filename = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`
    contentType = 'application/json'
  } else if (format === 'csv') {
    content = toCSV(notes, budgets)
    filename = `lifeos-export-${new Date().toISOString().slice(0, 10)}.csv`
    contentType = 'text/csv; charset=utf-8'
  } else {
    const mdParts: string[] = []
    if (notes.length > 0) mdParts.push(notesToMarkdown(notes))
    if (budgets.length > 0) mdParts.push(budgetsToMarkdown(budgets))
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
