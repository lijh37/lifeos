import { NextRequest, NextResponse } from 'next/server'
import { getNotes } from '@/lib/db'
import { isAuthorized } from '@/lib/auth-guard'
import type { Note } from '@/lib/types'

function toBeijingTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(/\//g, '-')
  } catch {
    // Fallback: manual ISO-slice formatting (YYYY-MM-DD HH:mm) if locale/timezone fails.
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
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

    lines.push(`## ${note.title || '无标题'}`)
    lines.push('')

    const meta: string[] = [`创建: ${toBeijingTime(note.createdAt)}`, `更新: ${toBeijingTime(note.updatedAt)}`]
    if (note.tags.length > 0) meta.push(`标签: ${note.tags.join('、')}`)
    if (note.dueDate) meta.push(`截止: ${note.dueDate.slice(0, 10)}`)
    lines.push(meta.join(' · '))
    lines.push('')

    if (note.content) {
      lines.push(note.content.replace(/^---\s*$/gm, '<hr>'))
    }

    lines.push('')
  }

  lines.push('---')
  lines.push('')

  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const notes = await getNotes(Number.MAX_SAFE_INTEGER)

  const content = notesToMarkdown(notes)
  const filename = `lifeos-notes-${new Date().toISOString().slice(0, 10)}.md`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
