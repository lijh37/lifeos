/**
 * 环境检测（纯函数模块）
 *
 * 唯一职责：判断当前运行环境是否为 Capacitor 原生（Android/iOS WebView）。
 * 禁止在此 import lib/db —— 避免把数据库适配器（@libsql/client / capacitor-sqlite）
 * 拉进 web client bundle。
 */

export function isNativeCapacitor(): boolean {
  try {
    if (typeof window === 'undefined') return false
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform()
  } catch {
    return false
  }
}
