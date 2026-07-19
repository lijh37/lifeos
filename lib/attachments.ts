// 附件上传白名单（客户端与服务端共享，防止漂移）。
// 注意：服务端按 MIME 类型严格校验，绝不信任 image/* 前缀，
// 以防止伪造 file.type 上传 image/svg+xml 等可执行子类型（存储型 XSS）。

export const ALLOWED_MIME_TYPES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/gzip',
])

// 每个 MIME 类型对应的标准扩展名（用于 file input 的 accept 属性）。
// 图片类型用 MIME（精确），办公/压缩类型用扩展名（兼容性更好）。
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/json': '.json',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/zip': '.zip',
  'application/gzip': '.gz',
}

/**
 * 构建 file input 的 accept 属性字符串。
 * 直接派生自 ALLOWED_MIME_TYPES，因此永远不会与服务端白名单漂移。
 */
export function buildAcceptAttribute(): string {
  return Array.from(ALLOWED_MIME_TYPES)
    .map((mime) => MIME_TO_EXTENSION[mime] ?? mime)
    .join(',')
}
