# LifeOS - 生活助手

个人生活助手应用。支持笔记管理、预算规划和习惯养成。PWA 支持手机和 PC 端，深色模式、数据备份恢复、附件上传。

## 技术栈

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui · Turso (libSQL) · Zustand · date-fns v4 · lucide-react

## 快速开始

```bash
npm install
cp .env.example .env.local   # 填入 Turso 数据库信息
npm run dev                   # http://localhost:3000
```

## 部署

```bash
git push origin main          # Vercel 自动部署
```

生产地址: **https://opencode-demo.vercel.app**

### 环境变量

| 变量 | 说明 |
|------|------|
| `TURSO_DATABASE_URL` | Turso 数据库地址 |
| `TURSO_AUTH_TOKEN` | Turso 认证 Token |
| `APP_PASSWORD` | 登录密码（可选，留空则不启用） |

## 测试

```bash
npm test           # 47 单元测试
npm run test:e2e   # Playwright E2E（TODO）
```

> 详细项目文档见 `AGENTS.md`（目录结构、关键约定、性能优化约定、PWA 安装约定等）。
