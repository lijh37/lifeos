# LifeOS — 个人生活助手

PWA 应用，支持笔记管理、预算规划、习惯养成。

## 快速开始

```bash
git clone <repo> && cd opencode-demo
npm install
cp .env.example .env.local       # 编辑 DATABASE_URL=file:./data/dev.db
npm run dev                       # 首次自动建表，http://localhost:3000
```

> `.env.local` **不得**设置 `TURSO_DATABASE_URL`，否则 dev 护栏会拒绝连接远程生产库。

## 功能概览

| 功能 | 路由 | 说明 |
|------|------|------|
| 笔记管理 | `/notes` | Markdown 编辑、标签分类、搜索、置顶、附件上传 |
| 预算规划 | `/expenses` | 月度预算设置、实际支出对比、进度条 |
| 习惯养成 | `/habits` | 每日/每周打卡、连续天数、趋势统计 |
| 设置 | `/settings` | 备份导出/恢复 JSON |

## 文档索引

- [技术参考 → AGENTS.md](AGENTS.md)（面向 AI Agent 的完整项目技术文档）
- [部署指南 → DEPLOY.md](DEPLOY.md)（双环境部署与运维）

## 技术栈

**Next.js 16.2.9 (App Router)** + **TypeScript ^5** + **Tailwind v4** + **shadcn/ui base-nova** (`@base-ui/react ^1.6.0` + `class-variance-authority`) + **`@libsql/client` ^0.17.4** (SQLite/Turso) + **Zustand ^5.0.14** + **date-fns ^4.4.0** + **lucide-react ^1.21.0** + **react-markdown** + **sonner ^2.0.7** + **tw-animate-css ^1.4.0**

## 项目状态

**版本**: 0.2.1 | **Node**: >= 20 | **License**: 私有

---

最后更新：2026-07-21 | 变更：三文件精简重构，保留 24 项审计修复
