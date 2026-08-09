/**
 * 标签服务（lib/services 环境分流层）
 *
 * - Capacitor 原生：直接调用 lib/db 模块
 * - Web / 测试：fetch('/api/tags') 透传，调用形状与现有组件/API route 逐字一致
 */

import { isNativeCapacitor } from './env'
import { throwHttpError } from './http'

export async function listTags(): Promise<{ name: string; count: number }[]> {
  if (isNativeCapacitor()) {
    const { getAllTags } = await import('@/lib/db/native')
    return getAllTags()
  }

  const res = await fetch('/api/tags')
  if (!res.ok) await throwHttpError(res)
  const data = await res.json()
  return data.tags
}

export async function renameTag(oldName: string, newName: string): Promise<void> {
  if (isNativeCapacitor()) {
    const { renameTag: dbRenameTag } = await import('@/lib/db/native')
    return dbRenameTag(oldName, newName)
  }

  const res = await fetch('/api/tags', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName, newName }),
  })
  if (!res.ok) await throwHttpError(res)
}

export async function deleteTag(name: string): Promise<void> {
  if (isNativeCapacitor()) {
    const { deleteTag: dbDeleteTag } = await import('@/lib/db/native')
    return dbDeleteTag(name)
  }

  const res = await fetch(`/api/tags?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
  if (!res.ok) await throwHttpError(res)
}
