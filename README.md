# LifeOS - 生活助手

你的个人生活助手，支持笔记管理、预算规划和习惯养成。手机和 PC 均可使用，支持深色模式、数据导出和离线访问。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **数据库**: Turso (云端，基于 libSQL)
- **状态管理**: Zustand
- **日期处理**: date-fns v4
- **图标**: lucide-react
- **部署**: Vercel

## 快速开始

### 1. 安装依赖

```bash
nvm use 24
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local 填入你的 Turso 数据库信息
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 手机端 / PWA 访问

PWA 安装需要 HTTPS（localhost 除外）：

```bash
# 推荐：局域网 HTTPS（地址不变，一劳永逸）
bash start.sh                 # 启动（含证书生成）
# 手机 → https://<LAN-IP>:3000

# 备选：HTTPS 隧道（无局域网时）
bash scripts/tunnel.sh
# 手机打开输出的 https://xxx.trycloudflare.com
```

| 必要条件 | 说明 |
|---|---|
| HTTPS | PWA 必须在 HTTPS 下运行 |
| 用户交互 | 需在页面上点击后才能触发安装提示 |
| Service Worker | `/sw.js` 注册并返回 200 |

诊断面板：右上角 Bug 图标或 `?debug=1`。

## 功能

### 已实现

**记录与管理**
- [x] 笔记管理 — 按标签筛选、关键词搜索、标记完成、删除
- [x] 批量操作 — 多选笔记 → 批量删除/改标签
- [x] 笔记置顶 — 重要笔记置顶优先展示
- [x] 预算管理 — 月度预算规划（固定/浮动支出），实际录入对比，超支/结余分析
- [x] 习惯养成 — 每日打卡，连续天数 streak，7 天趋势图
- [x] Markdown 编辑器 — 分栏编辑（工具栏/自动保存/实时预览）

**数据分析与导出**
- [x] 标签管理 — 查看/重命名/删除标签
- [x] 数据导出 — Markdown（阅读分享） / JSON（备份恢复）
- [x] 数据备份 — 手动 JSON 导入/导出 + 自动 localStorage 备份
- [x] 附件上传 — 笔记支持文件/图片附件

**界面与体验**
- [x] 深色模式 — light/dark/system 三态切换
- [x] 离线支持 — Service Worker + PWA 安装提示
- [x] UI 动效 — 页面过渡、骨架屏（多种变体）、交错入场、卡片悬浮
- [x] 多端自适应 — PC 侧栏导航 + 手机底部 Tab

**安全**
- [x] 密码保护 — proxy.ts 中间件 + /login 页面
- [x] API 鉴权 — Cookie / Bearer Token 双模式
- [x] XSS 防护 — rehype-sanitize Markdown 净化

### 规划中

- [ ] E2E 测试用例编写

## 项目结构

```
opencode-demo/
├── app/                   # Next.js App Router 页面和 API
│   ├── api/               # API 端点（10 个路由）
│   ├── notes/             # 笔记列表页 + 详情页
│   ├── expenses/          # 月度预算页
│   ├── habits/            # 习惯页面
│   ├── tags/              # 标签管理
│   ├── settings/          # 设置
│   └── login/             # 登录页
├── components/
│   ├── ui/                # shadcn 组件
│   ├── note-list.tsx      # 笔记列表（批量操作+置顶+搜索+无限滚动）
│   ├── markdown-editor.tsx # Markdown 编辑器（分栏编辑+工具栏+自动保存）
│   ├── sidebar.tsx        # 导航组件（PC 侧栏 + 手机底部栏）
│   ├── skeleton-card.tsx  # 骨架屏（多种变体）
│   ├── error-boundary.tsx # Error Boundary
│   └── ...                # 其他组件
├── lib/
│   ├── db/                # 数据库模块（模块化，通过 index.ts 重导出）
│   ├── types.ts           # TypeScript 类型
│   └── utils.ts           # 工具函数
├── store/                 # Zustand 状态管理
├── scripts/               # 工具脚本
├── e2e/                   # Playwright E2E 测试（TODO）
├── proxy.ts               # Next.js 16 中间件（密码保护）
└── vercel.json            # 部署配置
```

## 部署

生产地址: **https://opencode-demo.vercel.app**

```bash
git push origin main
# Vercel 自动重部署
```

### 环境变量

| 变量 | 说明 |
|---|---|
| `TURSO_DATABASE_URL` | Turso 数据库地址 |
| `TURSO_AUTH_TOKEN` | Turso 认证 Token |
| `APP_PASSWORD` | 登录密码（默认 `demo`） |

项目使用 Turso 远程数据库，通过 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 环境变量连接。不再使用本地 SQLite。

## WSL2 提示

WSL2 有独立虚拟 IP，局域网其他设备不能直接访问。
- **PC 端**: Windows 浏览器 `http://localhost:3000`（自动转发到 WSL2）
- **手机端**: 运行 `bash start.sh` 后访问 `https://<LAN-IP>:3000`；或运行 `.\setup-wsl.ps1`（管理员 PowerShell）配合 `bash scripts/tunnel.sh` 创建隧道
- **生产**: `git push origin main` → Vercel 自动部署
