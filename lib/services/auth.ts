/**
 * 认证服务（lib/services 环境分流层）
 *
 * - Capacitor 原生：离线无登录，直接放行
 * - Web / 测试：POST /api/auth 透传
 */

import { isNativeCapacitor } from './env'
import { throwHttpError } from './http'

export async function login(password: string): Promise<{ ok: boolean }> {
  if (isNativeCapacitor()) {
    return { ok: true }
  }

  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) await throwHttpError(res)
  return res.json()
}
