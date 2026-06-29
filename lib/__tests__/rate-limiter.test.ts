import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RateLimiter } from '@/lib/rate-limiter'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    vi.useFakeTimers()
    limiter = new RateLimiter(5, 60000) // 5 req/min for faster tests
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow requests within limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('test-key')).toBe(true)
    }
  })

  it('should block requests when limit exceeded', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('test-key')
    }
    expect(limiter.check('test-key')).toBe(false)
  })

  it('should reset after window expires', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('test-key')
    }
    expect(limiter.check('test-key')).toBe(false)

    vi.advanceTimersByTime(60001)

    expect(limiter.check('test-key')).toBe(true)
  })

  it('remaining should return correct count', () => {
    expect(limiter.remaining('test-key')).toBe(5)

    limiter.check('test-key')
    expect(limiter.remaining('test-key')).toBe(4)

    limiter.check('test-key')
    expect(limiter.remaining('test-key')).toBe(3)
  })

  it('should handle multiple keys independently', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('key-a')
    }
    expect(limiter.check('key-a')).toBe(false)
    expect(limiter.check('key-b')).toBe(true)
    expect(limiter.remaining('key-b')).toBe(4)
  })

  it('should cleanup expired entries', () => {
    limiter.check('old-key')

    vi.advanceTimersByTime(60001)

    // Trigger cleanup by checking 10 times (every 10th check triggers cleanup)
    for (let i = 0; i < 10; i++) {
      limiter.check('trigger-' + i)
    }

    // old-key entry should be gone, new key should have full limit
    expect(limiter.remaining('old-key')).toBe(5)
  })
})
