/**
 * 客户端入口桶（仅供 lib/services 的 Capacitor 原生分支动态导入）
 *
 * 注册 capacitor 适配器；web 客户端 bundle 也会编译此 chunk，
 * 但内容浏览器安全（插件包本身为动态 import），libsql 适配器永不进入本图。
 */
import { registerAdapter } from './client'

registerAdapter(() => import('./adapters/capacitor').then((m) => m.createCapacitorDb()))
export * from './client'
export * from './notes'
export * from './habits'
export * from './budgets'
export * from './tags'
export * from './weight'
export { migrate } from './migrate'
