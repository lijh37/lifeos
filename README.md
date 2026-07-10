# LifeOS - 生活助手

个人生活助手应用，支持笔记管理、预算规划和习惯养成。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:3000
bash start.sh      # HTTPS + PWA 模式
```

环境变量：复制 `.env.example` 为 `.env.local`，填入 Turso 数据库信息。

## 部署

`git push origin main` → Vercel 自动部署。

生产地址：https://opencode-demo.vercel.app

## 环境变量

| 变量 | 说明 |
|------|------|
| `TURSO_DATABASE_URL` | Turso 数据库地址 |
| `TURSO_AUTH_TOKEN` | Turso 认证 Token |
| `APP_PASSWORD` | 登录密码（留空关闭鉴权） |
