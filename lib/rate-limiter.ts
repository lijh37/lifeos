/**
 * 基于内存的滑动窗口限流器。
 * 以每个 key 为粒度，在给定的时间窗口内限制最大请求次数。
 * 超过限制后返回 false，直到窗口重置。
 *
 * @example
 * const limiter = new RateLimiter(10, 60000) // 每分钟最多 10 次
 * if (limiter.check("user:123")) {
 *   // 允许请求
 * }
 */
export class RateLimiter {
  private requests = new Map<string, { count: number; resetAt: number }>()
  private checkCount = 0

  /**
   * @param maxRequests - 时间窗口内允许的最大请求次数，默认 20
   * @param windowMs - 时间窗口长度（毫秒），默认 60000（1 分钟）
   */
  constructor(
    private maxRequests = 20,
    private windowMs = 60000,
  ) {}

  /**
   * 检查指定 key 在当前时间窗口内是否允许请求。
   *
   * 如果该 key 没有记录或窗口已过期，则创建新窗口并返回 true；
   * 如果已达到最大请求次数则返回 false；否则递增计数并返回 true。
   *
   * 每调用 10 次会自动触发一次过期记录清理。
   *
   * @param key - 限流标识（如用户 ID、IP 地址）
   * @returns 当前请求是否被允许
   */
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

  /**
   * 返回指定 key 在当前时间窗口内剩余的可用请求次数。
   *
   * @param key - 限流标识
   * @returns 剩余可用次数，如果窗口已过期则返回最大限额
   */
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

/** 聊天空口全局限流器，每分钟最多 20 次请求 */
export const chatRateLimiter = new RateLimiter(20, 60000)
