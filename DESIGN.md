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

<!-- 每次功能迭代的关键决策，区别于上方的核心设计决策 -->

| 日期 | 决策 | 理由 |
|------|------|------|
| <!-- 示例 --> | <!-- 决策内容 --> | <!-- 理由 -->
