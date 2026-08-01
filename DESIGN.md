# LifeOS — 设计文档

> 随开发演进的活文档。AI 和人共同维护。

## 需求

### 项目定位

LifeOS 是个人生活助手 PWA，支持笔记管理、预算规划、习惯养成。

- 单用户、自托管优先、无外部服务依赖
- 双生产环境（阿里云 ECS Docker + Vercel 备用）

### 当前迭代

<!-- 记录当前正在开发的功能迭代 -->

### 待办需求

<!-- 待实现的功能需求 -->

## 设计方案

### 架构概览

- **框架**: Next.js 16 App Router 单体（SSR + API Routes 同仓）
- **认证**: 无状态 HMAC（`crypto.subtle.sign`），无 session store
- **数据库**: `@libsql/client` 双模（本地 SQLite / 远程 Turso），`getClient()` 单例切换
- **存储**: 驱动抽象（Vercel Blob / 本地磁盘），`STORAGE_DRIVER` 切换
- **部署**: 双生产环境，数据独立

### 核心设计决策

| 决策 | 方案 | 理由 | 代价 |
|------|------|------|------|
| 双生产环境 | 主: 阿里云 ECS Docker; 备: Vercel + Turso + Blob | 解耦 Vercel，摆脱平台锁定；主生产 PWA 不受冷启动影响 | 手动备份恢复切换；两套环境变量配置 |
| 存储驱动抽象 | `StorageDriver` 接口 + VercelBlob/LocalDisk 两实现 | 同一份代码跑在两环境，不修改调用方 | 本地驱动需 Nginx 配合提供 `/uploads/` 静态文件服务 |
| 无状态 HMAC 认证 | `crypto.subtle.sign` 派生 token，cookie 或 Bearer 传递 | Zero DB 依赖，Edge + Node 双运行时兼容；改密码即令旧 token 失效 | 无法直接升级多用户（无此需求） |

## 实现计划

| 步骤 | 内容 | 状态 | 任务文件 |
|------|------|------|---------|
| <!-- 示例 --> | <!-- 功能描述 --> | todo/doing/done | tasks/{status}/xx-xxx.md |

## 决策记录

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-07-18 | dev 护栏：非生产 + Turso URL 匹配 `/turso\.(io\|tech)/i` → 抛错 | 隔离开发与生产库，防止本地误连远程真实数据 |
| 2026-07-18 | `COOKIE_SECURE` 环境变量化 | 自托管 HTTP 阶段免登录跳回，备案 HTTPS 后切 `true` |
| 2026-07-18 | 移除主题切换 | 单用户无多主题需求，减少状态面 |
| 2026-07-19 | 锁定 `node:20-slim` | 规避 npm 在 Node 22+ 的 "Exit handler never called" bug（npm/cli#7639） |
| 2026-07-19 | 移除 `next/font/google` | 保证 Docker 离线构建可行 |
| 2026-07-20 | 放弃 FTS5 全文搜索，改用 LIKE-only | 单用户数据量小，LIKE 足够且省维护复杂度 |
| 2026-07-20 | 放弃游标分页，简化列表加载 | 减少分页状态面，offset 分页满足需求 |
| 2026-07-20 | 削减过度设计（虚拟列表/复杂动画/冗余测试） | 个人项目 YAGNI，砍掉无收益复杂度 |
