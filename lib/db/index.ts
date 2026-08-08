import { registerAdapter } from './client'

// 服务端入口：注册 libsql 适配器（惰性动态 import，首次 getClient() 才加载）
registerAdapter(() => import('./adapters/libsql').then((m) => m.createLibsqlDb()))

export * from './client'
export * from './notes'
export * from './habits'
export * from './budgets'
export * from './tags'
export * from './weight'
export { migrate } from './migrate'
