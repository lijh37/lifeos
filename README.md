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

```env
DEEPSEEK_API_KEY=sk-your-key-here
DATABASE_URL=file:./data/life.db
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
bash scripts/https-setup.sh   # 首次生成证书，仅一次
bash start.sh                 # 启动
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
- [x] AI 对话式记录 — 自然语言输入，AI 自动解析为笔记/任务/事件/习惯
- [x] 笔记管理 — 按类型筛选、搜索、标记完成、删除
- [x] 任务管理 — 标记完成/未完成，按截止日期排序
- [x] 预算管理 — 月度预算规划（固定/浮动支出），实际录入对比，超支/结余分析
- [x] 习惯养成 — AI 创建习惯，每日打卡，连续天数 streak 徽章
- [x] 日历视图 — 月历网格，彩色圆点标记条目类型，点击查看当日详情
- [x] 全局搜索 — 跨笔记/习惯全文搜索，防抖 300ms
- [x] 统计看板 — 数据概览、预算执行、热门标签、动态时间线
- [x] 标签管理 — 查看/重命名/删除标签
- [x] 数据导出 — Markdown / JSON / CSV（Excel 中文友好）
- [x] 深色模式 — light/dark/system 三态切换
- [x] 离线支持 — Service Worker + PWA 安装提示
- [x] 数据管理 — 设置页：数据清除、备份导出/导入恢复
- [x] 富文本编辑 — TipTap 编辑器（粗体/斜体/标题/列表/任务列表）
- [x] UI 动效 — 页面过渡、骨架屏、交错入场、卡片悬浮
- [x] 通知提醒 — 到期任务/事件浏览器推送 + 内联提醒卡片
- [x] 多端自适应 — PC 侧栏导航 + 手机底部 Tab

### 规划中
- [ ] 饮食+锻炼追踪 — 拍照识食物，运动记录
- [ ] 附件上传 — 笔记图片/文件附件
- [ ] 聊天历史持久化 — 恢复对话上下文

## 项目结构

```
opencode-demo/
├── app/
│   ├── page.tsx              # AI 对话首页
│   ├── notes/page.tsx        # 笔记列表
│   ├── tasks/page.tsx        # 任务列表
│   ├── expenses/page.tsx     # 预算管理页面
│   ├── habits/page.tsx       # 习惯页面
│   ├── calendar/page.tsx     # 日历视图
│   ├── search/page.tsx       # 全局搜索
│   ├── tags/page.tsx         # 标签管理
│   ├── stats/page.tsx        # 统计看板
│   ├── settings/page.tsx     # 设置
│   ├── login/page.tsx        # 登录页
│   └── api/
│       ├── chat/route.ts     # DeepSeek 流式对话
│       ├── notes/route.ts    # 笔记 CRUD
│       ├── notes/[id]/route.ts # 单条笔记 GET/PATCH/DELETE
│       ├── budgets/route.ts  # 预算 CRUD
│       ├── habits/route.ts   # 习惯 CRUD（含 streaks）
│       ├── export/route.ts   # 导出（MD/JSON/CSV）
│       ├── search/route.ts   # 跨类型搜索
│       ├── tags/route.ts     # 标签管理
│       ├── settings/route.ts # 数据统计 + 清除
│       ├── auth/route.ts     # 密码验证
│       ├── import/route.ts   # JSON 备份导入
│       └── stats/route.ts    # 聚合统计
├── components/
│   ├── ui/                   # shadcn 组件
│   ├── chat.tsx              # AI 对话组件
│   ├── note-list.tsx         # 笔记/任务列表组件
│   ├── rich-editor.tsx       # 富文本编辑器（基于 TipTap）
│   ├── sidebar.tsx           # 导航组件（PC 侧栏 + 手机底栏）
│   ├── fab-button.tsx        # 悬浮快捷按钮
│   ├── export-button.tsx     # 导出按钮
│   ├── theme-provider.tsx    # 主题上下文
│   ├── theme-toggle.tsx      # 深色模式切换
│   ├── pwa-handler.tsx       # PWA 安装管理 + 诊断面板
│   ├── notification-manager.tsx # 通知提醒管理器
│   ├── page-animation.tsx    # 页面过渡动效
│   └── skeleton-card.tsx     # 骨架屏
├── lib/
│   ├── db.ts                 # 数据库操作（双模式：SQLite/Turso）
│   ├── types.ts              # TypeScript 类型
│   ├── prompts.ts            # AI 系统提示词
│   ├── constants.ts          # 共享常量（类型颜色/分类标签映射）
│   └── utils.ts              # cn() 工具函数
├── store/
│   └── index.ts              # Zustand 状态管理
├── scripts/
│   ├── https-setup.sh       # HTTPS 开发证书一键生成
│   ├── migrate-to-turso.ts  # 本地→Turso 数据迁移
│   ├── setup-turso.ts       # Turso 数据库创建 + 迁移
│   ├── list-turso.ts        # Turso 数据列表
│   └── tunnel.sh            # HTTPS 隧道（cloudflared/ngrok/localtunnel）
├── data/
│   └── schema.sql            # 数据库完整 DDL
├── proxy.ts                  # Next.js 密码保护中间件
├── vercel.json               # Vercel 部署配置
└── public/
    ├── manifest.json          # PWA 配置
    ├── sw.js                  # Service Worker
    └── icons/                 # 应用图标
```

## 如何与 AI 对话

直接在输入框用自然语言描述，AI 会自动理解并记录：

```
"明天下午3点和张三开会讨论项目进度"
→ 创建事件

"我想每天跑步"
→ 创建习惯

"提醒我今晚8点锻炼"
→ 创建任务 + 截止时间

"最近一周做了什么"
→ 查询历史并总结
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

本地开发使用 SQLite（`data/life.db`），设置 `TURSO_DATABASE_URL` 时自动切换到 Turso 云数据库：

```bash
npm run migrate   # 本地数据迁移到 Turso
```

## WSL2 提示

WSL2 有独立虚拟 IP，局域网其他设备不能直接访问。
- **PC 端**: Windows 浏览器 `http://localhost:3000`（自动转发到 WSL2）
- **手机端**: 运行 `bash scripts/https-setup.sh` 后访问 `https://<LAN-IP>:3000`；或运行 `.\setup-wsl.ps1`（管理员 PowerShell）配合 `bash scripts/tunnel.sh` 创建隧道
- **生产**: `git push origin main` → Vercel 自动部署
