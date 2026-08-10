import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 返回本地时区的日期字符串（YYYY-MM-DD）。
 *
 * 不要用 `new Date().toISOString().slice(0, 10)` 取"今天"——那是 UTC 日期，
 * 在 UTC+8 等东时区凌晨 00:00-08:00 会返回前一天（习惯页曾因此显示昨天的打卡）。
 */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 返回本地时区的月份字符串（YYYY-MM）。 */
export function localMonthStr(d: Date = new Date()): string {
  return localDateStr(d).slice(0, 7)
}
