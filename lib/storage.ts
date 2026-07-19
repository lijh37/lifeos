import { put, del } from '@vercel/blob'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

/**
 * 存储驱动抽象层。
 *
 * 目的：解耦 Vercel Blob 与自托管（本地磁盘）存储，使同一份代码可同时运行在
 * Vercel（STORAGE_DRIVER=vercel）与宝塔/Docker 自托管（STORAGE_DRIVER=local）环境。
 *
 * 切换完全由环境变量驱动，不修改任何调用方逻辑：
 *   - STORAGE_DRIVER=vercel（默认）→ VercelBlobDriver，行为与改造前字节级一致
 *   - STORAGE_DRIVER=local         → LocalDiskDriver，文件写入本地磁盘，URL 为 /uploads/* 相对路径
 */

export interface SavedFile {
  /** 可公开访问的 URL（Vercel 为完整 https 地址，本地为 /uploads/xxx 相对路径） */
  url: string
}

export interface StorageDriver {
  /** 保存一个文件，返回可访问的 URL */
  save(file: File, mimeType: string): Promise<SavedFile>
  /** 删除一个 URL 对应的文件（幂等，失败不抛错） */
  remove(url: string): Promise<void>
}

// ─── Vercel Blob 驱动（原样保留现有逻辑）─────────────────────────────────────

class VercelBlobDriver implements StorageDriver {
  async save(file: File, mimeType: string): Promise<SavedFile> {
    const ext = path.extname(file.name).toLowerCase() || ''
    const filename = `${crypto.randomUUID()}${ext}`
    const blob = await put(filename, file, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: true,
    })
    return { url: blob.url }
  }

  async remove(url: string): Promise<void> {
    try {
      await del(url)
    } catch {
      // Blob 可能已被删除，忽略
    }
  }
}

// ─── 本地磁盘驱动（自托管用）────────────────────────────────────────────────

class LocalDiskDriver implements StorageDriver {
  private get uploadDir(): string {
    return process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')
  }

  /** 对外暴露的 URL 前缀（相对路径，由 Nginx / Next 静态服务解析） */
  private get urlPrefix(): string {
    return (process.env.UPLOAD_URL_PREFIX || '/uploads').replace(/\/$/, '')
  }

  async save(file: File, mimeType: string): Promise<SavedFile> {
    await fs.mkdir(this.uploadDir, { recursive: true })
    const ext = path.extname(file.name).toLowerCase() || ''
    const filename = `${crypto.randomUUID()}${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(path.join(this.uploadDir, filename), buffer)
    // 注意：/uploads/* 由 Nginx / Next 静态服务以文件扩展名推断的 content-type 提供。
    // 由于上传层（app/api/notes/[id]/attachments/route.ts）已禁止 image/svg+xml
    // 等可执行子类型，此处不会写入可被浏览器内联执行的 SVG 文件。
    return { url: `${this.urlPrefix}/${filename}` }
  }

  async remove(url: string): Promise<void> {
    try {
      // url 形如 /uploads/<filename>，提取文件名防止路径穿越
      const filename = path.basename(new URL(url, 'http://localhost').pathname)
      const target = path.join(this.uploadDir, filename)
      await fs.unlink(target)
    } catch {
      // 文件可能已被删除，忽略
    }
  }
}

// ─── 驱动工厂 ────────────────────────────────────────────────────────────────

let cached: StorageDriver | null = null

/**
 * 获取当前存储驱动。默认 vercel（保持 Vercel 生产环境行为不变）。
 */
export function getStorageDriver(): StorageDriver {
  if (cached) return cached
  const driver = (process.env.STORAGE_DRIVER || 'vercel').toLowerCase()
  cached = driver === 'local' ? new LocalDiskDriver() : new VercelBlobDriver()
  return cached
}
