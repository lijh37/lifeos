import { describe, it, expect } from 'vitest'
import { computeCurrentStreak, computeBestStreak } from '@/lib/db/habits'

// Helper: build a Set of YYYY-MM-DD from an array of 'YYYY-MM-DD' strings.
function setOf(...dates: string[]): Set<string> {
  return new Set(dates)
}

// Fixed "today" anchor so tests are timezone-stable (no reliance on real clock).
const TODAY = new Date('2026-07-19T12:00:00.000Z')

describe('computeCurrentStreak', () => {
  it('returns 0 for an empty set', () => {
    expect(computeCurrentStreak(setOf(), TODAY)).toBe(0)
  })

  it('counts a single completion today as 1', () => {
    expect(computeCurrentStreak(setOf('2026-07-19'), TODAY)).toBe(1)
  })

  it('counts an unbroken run ending today', () => {
    expect(
      computeCurrentStreak(
        setOf('2026-07-17', '2026-07-18', '2026-07-19'),
        TODAY
      )
    ).toBe(3)
  })

  it('stops at the first gap (does not count older completions)', () => {
    // 07-19, 07-18 done; 07-17 missing; 07-16 done -> streak is 2
    expect(
      computeCurrentStreak(
        setOf('2026-07-16', '2026-07-18', '2026-07-19'),
        TODAY
      )
    ).toBe(2)
  })

  it('counts yesterday as day 1 when today not yet done (gap breaks only after a counted day)', () => {
    // j=0 checks today (missing) but does not break (j>0 false); j=1 checks
    // yesterday (present) -> streak 1. Mirrors production dashboard behavior.
    expect(computeCurrentStreak(setOf('2026-07-18'), TODAY)).toBe(1)
  })

  it('caps at 365 days without infinite loop', () => {
    const all = setOf()
    for (let d = 0; d < 400; d++) {
      const c = new Date(TODAY)
      c.setDate(c.getDate() - d)
      all.add(c.toISOString().slice(0, 10))
    }
    expect(computeCurrentStreak(all, TODAY)).toBe(365)
  })

  it('respects a custom `from` anchor (not just real today)', () => {
    const from = new Date('2026-01-01T00:00:00.000Z')
    expect(
      computeCurrentStreak(setOf('2025-12-30', '2025-12-31', '2026-01-01'), from)
    ).toBe(3)
  })
})

describe('computeBestStreak', () => {
  it('returns 0 for an empty array', () => {
    expect(computeBestStreak([])).toBe(0)
  })

  it('returns 1 for a single date', () => {
    expect(computeBestStreak(['2026-07-19'])).toBe(1)
  })

  it('returns the full length for one unbroken run', () => {
    expect(
      computeBestStreak([
        '2026-07-15',
        '2026-07-16',
        '2026-07-17',
        '2026-07-18',
        '2026-07-19',
      ])
    ).toBe(5)
  })

  it('returns the longest of multiple runs separated by gaps', () => {
    // run A: 07-10..07-12 (3), gap, run B: 07-15..07-17 (3) -> best 3
    expect(
      computeBestStreak([
        '2026-07-10',
        '2026-07-11',
        '2026-07-12',
        '2026-07-15',
        '2026-07-16',
        '2026-07-17',
      ])
    ).toBe(3)
  })

  it('picks the longer run when the second is longer', () => {
    // run A: 07-01..07-02 (2), run B: 07-10..07-13 (4) -> best 4
    expect(
      computeBestStreak([
        '2026-07-01',
        '2026-07-02',
        '2026-07-10',
        '2026-07-11',
        '2026-07-12',
        '2026-07-13',
      ])
    ).toBe(4)
  })

  it('resets after a multi-day gap', () => {
    // 07-01, gap 2 days, 07-04 -> best 1
    expect(computeBestStreak(['2026-07-01', '2026-07-04'])).toBe(1)
  })
})
