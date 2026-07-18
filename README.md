# LifeOS - 生活助手

个人生活助手应用。支持笔记管理、预算规划和习惯养成。PWA 支持手机和 PC 端，深色模式、数据备份恢复、附件上传。

## 技术栈

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui (`base-nova`, `@base-ui/react`) · Turso (libSQL) · Zustand v5 · date-fns v4 · lucide-react · sonner · `@tanstack/react-virtual` · `@vercel/blob`

## 快速开始

```bash
npm install
cp .env.example .env.local   # 填入 Turso 数据库信息（及可选的 Blob Token）
npm run dev                   # http://localhost:3000
```

## 部署

```bash
git push origin main          # Vercel 自动部署
```

生产地址: **https://opencode-demo.vercel.app**

### 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `TURSO_DATABASE_URL` | 是 | Turso 数据库地址 |
| `TURSO_AUTH_TOKEN` | 是 | Turso 认证 Token |
| `APP_PASSWORD` | 否 | 登录密码（不设置则跳过认证，.env.example 默认 `demo`）|
| `BLOB_READ_WRITE_TOKEN` | 否（附件功能） | Vercel Blob 存储 Token |
| `DATABASE_URL` | 否 | 本地 SQLite（CI 单元测用 `:memory:`；E2E 用 `.e2e-test.db` 隔离；本地开发可选 `file:./data/dev.db` 避免连生产）|

## 测试

```bash
npm test           # vitest 单元测试（9 文件，141 测试）
npm run test:e2e   # Playwright E2E（13 测试：smoke/notes/budgets/habits）
npm run analyze    # 分析构建产物体积（需要 ANALYZE=true）
```

> E2E 以空 `APP_PASSWORD` 启动 dev server 绕过认证，自动覆盖笔记/预算/习惯核心流程。详见 `AGENTS.md`。

> 详细项目文档见 `AGENTS.md`（目录结构、关键约定、性能优化约定、PWA 说明等）。
