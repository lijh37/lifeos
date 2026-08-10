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

// n 天前的本地日期串（与 scanGraceRuns 的 setDate(+1) 逐日遍历同语义，各时区一致）
function daysAgo(n: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return localDateStr(d)
}

describe('computeCurrentStreak (宽容式 never-miss-twice)', () => {
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

  it('keeps the streak across a single missed day (grace)', () => {
    // 完成 today, yesterday, 3/4/5 天前；漏 daysAgo(2) 一天 → 不断
    expect(
      computeCurrentStreak(
        setOf(daysAgo(5), daysAgo(4), daysAgo(3), daysAgo(1), todayStr),
        TODAY
      )
    ).toBe(5)
  })

  it('breaks the streak only after two consecutive missed days', () => {
    // 完成 today, yesterday, 4/5 天前；漏 daysAgo(2),(3) 连续两天 → 断
    expect(
      computeCurrentStreak(
        setOf(daysAgo(5), daysAgo(4), daysAgo(1), todayStr),
        TODAY
      )
    ).toBe(2)
  })

  it('does not count today as missed when not yet completed (anchor day)', () => {
    // 完成 daysAgo(1)..daysAgo(5)；今天未打不判漏 → 5
    expect(
      computeCurrentStreak(
        setOf(daysAgo(5), daysAgo(4), daysAgo(3), daysAgo(2), daysAgo(1)),
        TODAY
      )
    ).toBe(5)
  })

  it('keeps the streak when only yesterday is missed (grace)', () => {
    // 完成 daysAgo(2)..daysAgo(5)；昨天漏一天不断；今天未打不判漏 → 4
    expect(
      computeCurrentStreak(
        setOf(daysAgo(5), daysAgo(4), daysAgo(3), daysAgo(2)),
        TODAY
      )
    ).toBe(4)
  })

  it('drops to 0 when the two days before today are both missed', () => {
    // 仅完成 daysAgo(3)；daysAgo(1),(2) 连续漏两天 → 断到 0
    expect(computeCurrentStreak(setOf(daysAgo(3)), TODAY)).toBe(0)
  })

  it('counts yesterday as day 1 when today not yet done (no gap before first counted day)', () => {
    expect(computeCurrentStreak(setOf(daysAgo(1)), TODAY)).toBe(1)
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

  it('has no 365-day cap (400 consecutive days → 400, no infinite loop)', () => {
    const all = setOf()
    for (let d = 0; d < 400; d++) {
      const c = new Date(TODAY)
      c.setDate(c.getDate() - d)
      all.add(localDateStr(c))
    }
    expect(computeCurrentStreak(all, TODAY)).toBe(400)
  })
})

describe('computeBestStreak (宽容式 never-miss-twice)', () => {
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

  it('does not break the segment on a single missed day (grace)', () => {
    // 完成 today, yesterday, 3 天前；漏 daysAgo(2) 一天 → 全程仍为 3
    expect(computeBestStreak([daysAgo(3), daysAgo(1), todayStr])).toBe(3)
  })

  it('returns the longest segment when runs are separated by two missed days', () => {
    // 段 A: daysAgo(5),(6) = 2；漏 daysAgo(3),(4) 连续两天断；段 B: today,(1),(2) = 3
    expect(
      computeBestStreak([
        daysAgo(6),
        daysAgo(5),
        daysAgo(2),
        daysAgo(1),
        todayStr,
      ])
    ).toBe(3)
  })

  it('resets after a multi-day gap', () => {
    // today, gap 2 days, 3 days ago → best 1
    expect(computeBestStreak([daysAgo(3), todayStr])).toBe(1)
  })
})
