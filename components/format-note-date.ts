import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatNoteDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  // 纯日期串（YYYY-MM-DD）按本地午夜解析，避免 new Date('YYYY-MM-DD') 的 UTC 偏移
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(`${dateStr}T00:00:00`)
    : new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffHours < 48) return '昨天'
  if (diffHours < 168) return `${Math.floor(diffHours / 24)}天前`
  return format(date, 'yyyy/MM/dd HH:mm', { locale: zhCN })
}
