import { describe, it, expect } from 'vitest'
import { validateToggleDate, BACKFILL_WINDOW_DAYS } from '@/lib/services/habits'
import { localDateStr } from '@/lib/utils'

// Fixed "today" anchor so tests are timezone-stable (no reliance on real clock).
const TODAY = new Date('2026-07-19T12:00:00.000Z')
const todayStr = localDateStr(TODAY)

// n 天前的本地日期串（与生产 validateToggleDate 的本地比较同语义，各时区一致）
function daysAgo(n: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return localDateStr(d)
}

describe('validateToggleDate (宽容式补记窗口校验)', () => {
  it('exposes BACKFILL_WINDOW_DAYS = 3', () => {
    expect(BACKFILL_WINDOW_DAYS).toBe(3)
  })

  it('returns null for today, yesterday, and day-before-yesterday (window boundaries)', () => {
    expect(validateToggleDate(todayStr, TODAY)).toBeNull()
    expect(validateToggleDate(daysAgo(1), TODAY)).toBeNull()
    expect(validateToggleDate(daysAgo(2), TODAY)).toBeNull()
  })

  it('rejects future dates', () => {
    expect(validateToggleDate(daysAgo(-1), TODAY)).toBe('Cannot check in future dates')
  })

  it('rejects dates before the backfill window', () => {
    expect(validateToggleDate(daysAgo(3), TODAY)).toBe('Can only backfill the last 3 days')
    expect(validateToggleDate(daysAgo(30), TODAY)).toBe('Can only backfill the last 3 days')
  })

  it('rejects invalid formats and non-strings', () => {
    expect(validateToggleDate('2026-13-99', TODAY)).not.toBeNull()
    expect(validateToggleDate('2026-02-30', TODAY)).not.toBeNull()
    expect(validateToggleDate('abc', TODAY)).not.toBeNull()
    expect(validateToggleDate('', TODAY)).not.toBeNull()
    expect(validateToggleDate(undefined as unknown as string, TODAY)).not.toBeNull()
  })

  it('uses the explicitly passed today anchor instead of the real clock', () => {
    const from = new Date('2026-01-01T00:00:00.000Z')
    const fromStr = localDateStr(from)
    // 相对 from 锚点：from / from-1 / from-2 均合法
    expect(validateToggleDate(fromStr, from)).toBeNull()
    const fromDaysAgo = (n: number) => {
      const d = new Date(from)
      d.setDate(d.getDate() - n)
      return localDateStr(d)
    }
    expect(validateToggleDate(fromDaysAgo(1), from)).toBeNull()
    expect(validateToggleDate(fromDaysAgo(2), from)).toBeNull()
    // 未来（相对 from）
    expect(validateToggleDate('2026-01-03', from)).toBe('Cannot check in future dates')
    // 早于 from-2（相对 from）
    expect(validateToggleDate('2025-12-29', from)).toBe('Can only backfill the last 3 days')
  })
})
