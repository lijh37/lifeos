/**
 * 数据库客户端注册表 + 惰性门面（双模切换）
 *
 * 本文件不直接选择适配器，由「入口桶」注册：
 *   - lib/db/index.ts（服务端桶）→ registerAdapter(libsql)     ：Web/Node/API 路由
 *   - lib/db/native.ts（客户端桶）→ registerAdapter(capacitor)：Capacitor 原生分支
 *
 * getClient() 保持同步签名（lib/db 各模块在同步作用域调用它），
 * 通过内部惰性初始化 promise 实现异步连接打开（首次 execute/transaction 时才真正初始化）。
 * 「动态 import 保证未选中适配器不进 bundle」的职责在入口桶的工厂闭包中完成——
 * 工厂为惰性动态 import，首次 getClient() 才真正加载所选适配器。
 *
 * schema 初始化请调用 migrate()（@/lib/db/migrate）——Android 首启时在应用
 * bootstrap 阶段调用，Web/桌面由 `npm run dev` / `npm run migrate` 触发。
 */
import type { DbClient } from './db-client'

let singleton: DbClient | null = null
let adapterFactory: (() => Promise<DbClient>) | null = null

/** 惰性初始化门面：首次 execute/transaction 时才真正打开连接。
 *  初始化失败不缓存 rejected promise——重置后下次调用重试（真机首次失败
 *  多为一次性环境问题，如插件连接残留；永久缓存会导致全部接口持续失败）。 */
function lazyFacade(factory: () => Promise<DbClient>): DbClient {
  let init: Promise<DbClient> | null = null
  const ensure = () => {
    if (!init) {
      init = factory()
      init.catch(() => {
        init = null
      })
    }
    return init
  }
  return {
    execute: (query) => ensure().then((db) => db.execute(query)),
    transaction: () => ensure().then((db) => db.transaction()),
  }
}

/** 注册数据库适配器工厂（服务端入口注册 libsql，客户端入口注册 capacitor） */
export function registerAdapter(factory: () => Promise<DbClient>): void {
  adapterFactory = factory
}

export function getClient(): DbClient {
  if (singleton) return singleton
  if (!adapterFactory) {
    throw new Error('[db] 未注册数据库适配器（服务端入口注册 libsql，客户端入口注册 capacitor）')
  }
  singleton = lazyFacade(adapterFactory)
  return singleton
}
