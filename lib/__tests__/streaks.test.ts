import { describe, it, expect } from 'vitest'
import { computeCurrentStreak, computeBestStreak } from '@/lib/db/habits'
import { localDateStr } from '@/lib/utils'

// Helper: build a Set of YYYY-MM-DD from an array of 'YYYY-MM-DD' strings.
function setOf(...dates: string[]): Set<string> {
  return new Set(dates)
}

// Fixed "today" anchor so tests are timezone-stable (no reliance on real clock).
// 注意：日期串必须用 localDateStr 生成（与生产代码一致的本地时区），
// 否则 UTC+8 等时区下断言会与"今天"实际错位。
const TODAY = new Date('2026-07-19T12:00:00.000Z')
const todayStr = localDateStr(TODAY)

// n 天前的本地日期串（与 computeCurrentStreak 的 setDate(-1) 遍历同语义，各时区一致）
function daysAgo(n: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return localDateStr(d)
}

describe('computeCurrentStreak', () => {
  it('returns 0 for an empty set', () => {
    expect(computeCurrentStreak(setOf(), TODAY)).toBe(0)
  })

  it('counts a single completion today as 1', () => {
    expect(computeCurrentStreak(setOf(todayStr), TODAY)).toBe(1)
  })

  it('counts an unbroken run ending today', () => {
    expect(
      computeCurrentStreak(
        setOf(daysAgo(2), daysAgo(1), todayStr),
        TODAY
      )
    ).toBe(3)
  })

  it('stops at the first gap (does not count older completions)', () => {
    // today, yesterday done; 2 days ago missing; 3 days ago done -> streak is 2
    expect(
      computeCurrentStreak(
        setOf(daysAgo(3), daysAgo(1), todayStr),
        TODAY
      )
    ).toBe(2)
  })

  it('counts yesterday as day 1 when today not yet done (gap breaks only after a counted day)', () => {
    // j=0 checks today (missing) but does not break (j>0 false); j=1 checks
    // yesterday (present) -> streak 1. Mirrors production dashboard behavior.
    expect(computeCurrentStreak(setOf(daysAgo(1)), TODAY)).toBe(1)
  })

  it('caps at 365 days without infinite loop', () => {
    const all = setOf()
    for (let d = 0; d < 400; d++) {
      const c = new Date(TODAY)
      c.setDate(c.getDate() - d)
      all.add(localDateStr(c))
    }
    expect(computeCurrentStreak(all, TODAY)).toBe(365)
  })

  it('respects a custom `from` anchor (not just real today)', () => {
    const from = new Date('2026-01-01T00:00:00.000Z')
    const fromStr = localDateStr(from)
    const fromDaysAgo = (n: number) => {
      const d = new Date(from)
      d.setDate(d.getDate() - n)
      return localDateStr(d)
    }
    expect(
      computeCurrentStreak(setOf(fromDaysAgo(2), fromDaysAgo(1), fromStr), from)
    ).toBe(3)
  })
})

describe('computeBestStreak', () => {
  it('returns 0 for an empty array', () => {
    expect(computeBestStreak([])).toBe(0)
  })

  it('returns 1 for a single date', () => {
    expect(computeBestStreak([todayStr])).toBe(1)
  })

  it('returns the full length for one unbroken run', () => {
    expect(
      computeBestStreak([
        daysAgo(4),
        daysAgo(3),
        daysAgo(2),
        daysAgo(1),
        todayStr,
      ])
    ).toBe(5)
  })

  it('returns the longest of multiple runs separated by gaps', () => {
    // run A: 3 days (ending 3 days ago), gap, run B: 3 days ending today -> best 3
    expect(
      computeBestStreak([
        daysAgo(6),
        daysAgo(5),
        daysAgo(4),
        daysAgo(2),
        daysAgo(1),
        todayStr,
      ])
    ).toBe(3)
  })

  it('picks the longer run when the second is longer', () => {
    // run A: 2 days (ending 5 days ago), gap at 3 days ago, run B: 3 days ending today -> best 3
    expect(
      computeBestStreak([
        daysAgo(5),
        daysAgo(4),
        daysAgo(2),
        daysAgo(1),
        todayStr,
      ])
    ).toBe(3)
  })

  it('resets after a multi-day gap', () => {
    // today, gap 2 days, 3 days ago -> best 1
    expect(computeBestStreak([todayStr, daysAgo(3)])).toBe(1)
  })
})
