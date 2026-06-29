export class RateLimiter {
  private requests = new Map<string, { count: number; resetAt: number }>()
  private checkCount = 0

  constructor(
    private maxRequests = 20,
    private windowMs = 60000,
  ) {}

  check(key: string): boolean {
    // Periodic cleanup every 10 checks
    if (++this.checkCount % 10 === 0) this.cleanup()

    const now = Date.now()
    const entry = this.requests.get(key)

    if (!entry || now > entry.resetAt) {
      this.requests.set(key, { count: 1, resetAt: now + this.windowMs })
      return true
    }

    if (entry.count >= this.maxRequests) return false

    entry.count++
    return true
  }

  remaining(key: string): number {
    const entry = this.requests.get(key)
    if (!entry || Date.now() > entry.resetAt) return this.maxRequests
    return Math.max(0, this.maxRequests - entry.count)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.requests) {
      if (now > entry.resetAt) this.requests.delete(key)
    }
  }
}

export const chatRateLimiter = new RateLimiter(20, 60000)
