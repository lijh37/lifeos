# LifeOS - 生活助手

个人生活助手应用。支持笔记管理、预算规划和习惯养成。PWA 支持手机和 PC 端，深色模式、数据备份恢复、附件上传。

## 技术栈

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui (`base-nova`, `@base-ui/react`) · Turso (libSQL) · Zustand v5 · date-fns v4 · lucide-react · sonner · `@tanstack/react-virtual` · `@vercel/blob`

## 快速开始

```bash
npm install
# 本地开发用独立 SQLite（不要填 Turso 生产库，否则会直连生产数据）
# .env.local 只需一行：
#   DATABASE_URL=file:./data/dev.db
npm run dev                   # http://localhost:3000（首次启动自动建表）
```

> 注意：`.env.local` **不要**设置 `TURSO_DATABASE_URL`，否则 `getClient()` 会拒绝连接远程生产库（dev 护栏）。本地开发用上面的本地 SQLite 即可。

## 部署

本项目有两个生产环境，数据各自独立：

- **主生产（阿里云 Docker）**：详见 `DEPLOY.md`（`docker compose up -d`，本地 SQLite + 本地磁盘）
- **备用（Vercel）**：`git push origin main` → Vercel 自动部署，生产地址 **https://opencode-demo.vercel.app**（Turso + Vercel Blob）

### 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `TURSO_DATABASE_URL` | 备用生产必需 | Turso 数据库地址（主生产 Docker 显式清空此变量） |
| `TURSO_AUTH_TOKEN` | 备用生产必需 | Turso 认证 Token |
| `APP_PASSWORD` | 否 | 登录密码（不设置则跳过认证，.env.example 默认 `demo`）|
| `BLOB_READ_WRITE_TOKEN` | 否（附件功能） | Vercel Blob 存储 Token（仅备用生产用） |
| `DATABASE_URL` | 本地/主生产必需 | 本地 SQLite。dev 用 `file:./data/dev.db`；主生产 Docker 用 `file:./data/db/lifeos.db`；E2E 用 `.e2e-test.db`；单元测用 `:memory:` |
| `STORAGE_DRIVER` | 否 | `local`（主生产 Docker）/ `vercel`（默认，Vercel Blob） |

## 测试

```bash
npm test           # vitest 单元测试（10 文件，151 测试）
npm run test:e2e   # Playwright E2E（13 测试：smoke/notes/budgets/habits）
npm run analyze    # 分析构建产物体积（需要 ANALYZE=true）
```

> E2E 以空 `APP_PASSWORD` 启动 dev server 绕过认证，自动覆盖笔记/预算/习惯核心流程。详见 `AGENTS.md`。

> 详细项目文档见 `AGENTS.md`（目录结构、关键约定、性能优化约定、PWA 说明、环境隔离设计等）。
