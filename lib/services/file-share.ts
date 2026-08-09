/**
 * 跨环境文件保存（Capacitor 原生 / Web）
 *
 * - Capacitor 原生：写入应用 Cache 目录后调用系统分享面板（Filesystem + Share）。
 *   Android WebView 默认没有 DownloadListener，`<a download>` 点击后不会真正落盘
 *   （但页面会立即提示"成功"）——必须走原生分享，用户可选择"保存到文件"等目标。
 * - Web：Blob URL + `<a download>` 触发浏览器下载。
 */

import { isNativeCapacitor } from './env'

export interface SaveFileOptions {
  filename: string
  content: string
  mime: string
}

export async function saveFileToDevice({ filename, content, mime }: SaveFileOptions): Promise<void> {
  if (isNativeCapacitor()) {
    const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')

    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ title: filename, files: [uri] })
    return
  }

  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // 延迟 revoke，避免部分浏览器在下载尚未开始时即取消资源
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
