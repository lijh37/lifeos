# LifeOS - AI 生活助手

你的个人 AI 生活助手，支持自然语言记录笔记、管理任务、预算规划和习惯养成。手机和 PC 均可使用，支持深色模式、数据导出和离线访问。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: DeepSeek API (OpenAI 兼容接口)
- **数据库**: SQLite (本地) / Turso (云端同步)
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
# 编辑 .env.local 填入你的 API Key
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
- [x] AI 对话查询 — 自然语言提问，AI 搜索笔记/习惯/预算数据并回复
- [x] 笔记管理 — 按类型筛选、搜索、标记完成、删除
- [x] 批量操作 — 多选笔记 → 批量删除/改标签
- [x] 拖拽排序 — 笔记卡片拖拽重排
- [x] 预算管理 — 月度预算规划（固定/浮动支出），实际录入对比，超支/结余分析
- [x] 习惯养成 — 每日打卡，连续天数 streak，7 天趋势图
- [x] 全局搜索 — 跨笔记/习惯全文搜索，防抖 300ms
- [x] 聊天持久化 — 对话多会话管理，自动保存，刷新恢复

**数据分析与导出**
- [x] 统计看板 — 数据概览、预算执行、热门标签、动态时间线
- [x] 标签管理 — 查看/重命名/删除标签
- [x] 数据导出 — Markdown（阅读分享） / JSON（备份恢复）
- [x] 数据备份 — 手动 JSON 导入/导出 + 自动 localStorage 备份

**界面与体验**
- [x] 深色模式 — light/dark/system 三态切换
- [x] 离线支持 — Service Worker + PWA 安装提示
- [x] Markdown 编辑 — 分栏编辑器（工具栏/自动保存/实时预览）
- [x] UI 动效 — 页面过渡、骨架屏（3 种变体）、交错入场、卡片悬浮
- [x] 多端自适应 — PC 侧栏导航 + 手机底部 Tab

**安全**
- [x] 密码保护 — proxy.ts 中间件 + /login 页面
- [x] API 鉴权 — Cookie / Bearer Token 双模式
- [x] 速率限制 — /api/chat 20 req/min/IP
- [x] XSS 防护 — DOMPurify 显式白名单配置

### 规划中

- [ ] E2E 测试用例编写
- [ ] 附件上传 — 笔记图片/文件附件（数据库层已完成，待前端集成）

## 项目结构

```
opencode-demo/
├── app/                   # Next.js App Router 页面和 API
│   ├── api/               # API 端点（16 个）
│   ├── notes/             # 笔记列表页
│   ├── expenses/          # 月度预算页
│   ├── habits/            # 习惯页面
│   ├── search/            # 全局搜索
│   ├── tags/              # 标签管理
│   ├── stats/             # 统计看板
│   ├── settings/          # 设置
│   └── login/             # 登录页
├── components/
│   ├── ui/                # shadcn 组件
│   ├── chat.tsx           # AI 对话组件
│   ├── note-list.tsx      # 笔记列表（批量操作+拖拽排序+搜索）
│   ├── markdown-editor.tsx # Markdown 编辑器（分栏编辑+工具栏+自动保存）
│   ├── command-menu.tsx   # ⌘K 命令面板
│   ├── sidebar.tsx        # 导航组件（PC 侧栏 + 手机底部栏）
│   ├── skeleton-card.tsx  # 骨架屏（3 种变体）
│   ├── error-boundary.tsx # Error Boundary
│   └── ...                # 其他组件
├── lib/
│   ├── db.ts              # 数据库操作
│   ├── types.ts           # TypeScript 类型
│   ├── prompts.ts         # AI 系统提示词
│   ├── rate-limiter.ts    # 限流器
│   └── utils.ts           # 工具函数
├── store/                 # Zustand 状态管理
├── scripts/               # 工具脚本
├── e2e/                   # Playwright E2E 测试
├── proxy.ts               # Next.js 16 中间件（密码保护）
├── data/                  # 本地 SQLite 数据目录（gitignored）
└── vercel.json            # 部署配置
```

## 如何与 AI 对话

直接在输入框用自然语言提问，AI 会查询笔记/习惯/预算数据并回答：

```
"找一下关于电影的文章"
→ 搜索笔记

"我的习惯打卡情况怎么样"
→ 查询习惯进度

"这个月的预算还剩多少"
→ 查询预算信息

"最近一周做了什么"
→ 按日期范围查询笔记并总结
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
| `DEEPSEEK_API_KEY` | DeepSeek AI 推理 |
| `TURSO_DATABASE_URL` | Turso 数据库地址 |
| `TURSO_AUTH_TOKEN` | Turso 认证 Token |
| `APP_PASSWORD` | 登录密码（默认 `demo`） |

本地开发使用 SQLite（`data/life.db`），设置 `TURSO_DATABASE_URL` 时自动切换到 Turso 云数据库。

## WSL2 提示

WSL2 有独立虚拟 IP，局域网其他设备不能直接访问。
- **PC 端**: Windows 浏览器 `http://localhost:3000`（自动转发到 WSL2）
- **手机端**: 运行 `bash start.sh` 后访问 `https://<LAN-IP>:3000`；或运行 `.\setup-wsl.ps1`（管理员 PowerShell）配合 `bash scripts/tunnel.sh` 创建隧道
- **生产**: `git push origin main` → Vercel 自动部署
