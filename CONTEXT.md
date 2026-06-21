# LifeOS - 项目上下文（会话恢复用）

## 项目概述

个人 AI 生活助手应用，用户通过自然语言与 AI 对话，AI 自动解析为结构化笔记、任务、事件、收支或习惯。支持手机端和 PC 端、深色模式、数据导出、PWA 离线、统计看板。

## 当前状态（截至 2026-06-21）

### ✅ 已实现（25 路由，11 页面 + 12 API）

**核心能力**
- **AI 对话式记录**：DeepSeek 解析自然语言 → 自动创建笔记/任务/事件/支出/收入/习惯
- **笔记/任务/事件** 三种类型，自动打标签，按类型筛选、搜索、标记完成
- **收支管理**：AI 自动记账分类（餐饮/交通/购物等），月度汇总 + 分类柱状图
- **习惯养成**：AI 创建习惯 + 每日打卡 + 连续天数 streak 徽章

**页面（10 个）**
- `/` AI 对话首页（流式聊天，打字动画，超时重试，复制按钮）
- `/notes` 笔记列表（筛选/搜索/标记完成/删除）
- `/tasks` 任务列表（默认过滤 task 类型）
- `/expenses` 记账（月度汇总卡片 + 分类柱状图 + 类型筛选）
- `/habits` 习惯（每日打卡 + streak 连续天数 + 进度计数）
- `/calendar` 日历（月历网格 + 彩色圆点标记 + 点击查看当日详情）
- `/search` 全局搜索（跨笔记/收支/习惯，300ms 防抖，分组显示）
- `/tags` 标签管理（列表 + 内联重命名 + 删除确认）
- `/stats` 统计看板（摘要卡片 + 支出分类图 + 热门标签 + 最近动态）
- `/settings` 设置（数据概览/清除 + 备份导出/导入恢复 + 关于信息）

**API（8 个）**
- `/api/chat` DeepSeek 流式对话
- `/api/notes` 笔记 CRUD（支持 type/q/startDate/endDate 参数）
- `/api/expenses` 收支 CRUD
- `/api/habits` 习惯 CRUD（含 streaks 和今日完成）
- `/api/export` 导出（Markdown / JSON / CSV 含 BOM）
- `/api/search` 跨类型搜索
- `/api/tags` 标签管理（GET 列表 / PATCH 重命名 / DELETE 删除）
- `/api/settings` 数据统计 GET + 批量清除 DELETE
- `/api/import` JSON 备份导入 POST
- `/api/stats` 聚合统计（月度/分类/打卡/标签/动态）

**体验增强**
- **深色模式**：light/dark/system 三态切换（localStorage 持久化）
- **PWA 安装**：`beforeinstallprompt` useRef 保存 + onPointerDown 同步触发，含诊断面板（右上角 Bug / `?debug=1`）
- **通知提醒**：浏览器通知权限请求 + 到期检查（on mount + 每 5 分钟）+ 浏览器推送 + 内联降级提醒
- **UI 动效**：页面 fadeIn 过渡、列表交错入场、卡片 hover 悬浮、骨架屏加载
- **导航**：PC 侧栏 + 手机底部 Tab（10 项：对话/笔记/任务/记账/习惯/搜索/日历/标签/统计/设置）
- **数据导出**：Markdown / JSON / CSV（含 BOM，Excel 中文友好）

**基础设施**
- **生产部署**：Vercel `https://opencode-demo.vercel.app`，密码保护
- **云端数据库**：Turso `aps1` 集群，5 表已迁移
- **密码保护**：`proxy.ts` 验证 `app_auth` cookie，`/login` 登录页，`/api/auth` 接口
- **PWA 配置**：manifest.json（192+512 PNG 图标，maskable + any）
- **lint 零错误**，build 通过

### ❌ 待办

| 优先级 | 功能 | 备注 |
|---|---|---|
| P2 | **饮食+锻炼追踪** | 拍照识食物（需 GPT-4o vision API key） |
| P3 | **迭代优化** | 富文本编辑、附件上传、聊天持久化 |

## 技术栈

| 层 | 选型 |
|---|---|
| 前端框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| AI | DeepSeek API (`deepseek-v4-flash`) |
| AI SDK | `@ai-sdk/react` + `ai` (v6) |
| 数据库 | `@libsql/client` SQLite + Turso |
| 状态管理 | Zustand |
| 日期处理 | date-fns v4 |
| 图标 | lucide-react |

## AI SDK v6 关键约定

- `useChat` 从 `@ai-sdk/react` 导入（非 `ai/react`）
- 服务端 API Route 使用 `convertToModelMessages`（async）和 `result.toUIMessageStreamResponse()`
- 客户端使用 `DefaultChatTransport` 配置 API 端点
- DeepSeek 需使用 `deepseek.chat('deepseek-v4-flash')`（.chat() 走 Chat Completions API）
- 消息内容通过 `message.parts` 获取（而非 `message.content`）

## 项目结构

```
opencode-demo/
├── app/
│   ├── layout.tsx              # 全局布局（侧栏 + 底栏 + PWA 处理 + 通知管理器 + 页面动效）
│   ├── page.tsx                # AI 对话首页（dynamic import Chat）
│   ├── notes/page.tsx          # 笔记列表
│   ├── tasks/page.tsx          # 任务列表
│   ├── expenses/page.tsx       # 记账（月图 + 筛选）
│   ├── habits/page.tsx         # 习惯（打卡 + streak）
│   ├── calendar/page.tsx       # 日历视图
│   ├── search/page.tsx         # 全局搜索
│   ├── tags/page.tsx           # 标签管理
│   ├── stats/page.tsx          # 统计看板
│   ├── settings/page.tsx       # 设置（数据管理 + 备份恢复）
│   └── api/
│       ├── chat/route.ts       # DeepSeek 流式对话
│       ├── notes/route.ts      # 笔记 CRUD（含日期范围）
│       ├── notes/[id]/route.ts # 单条笔记 PATCH/DELETE
│       ├── expenses/route.ts   # 收支 CRUD
│       ├── habits/route.ts     # 习惯 CRUD（含 streaks）
│       ├── export/route.ts     # 导出 MD/JSON/CSV
│       ├── search/route.ts     # 跨类型搜索
│       ├── tags/route.ts       # 标签管理
│       ├── settings/route.ts   # 数据统计 + 批量清除
│       ├── auth/route.ts      # 密码验证（POST）
│       ├── import/route.ts     # JSON 备份导入
│       └── stats/route.ts      # 聚合统计
├── proxy.ts                    # Next.js 16 proxy 中间件（密码保护）
├── app/login/page.tsx          # 登录页
├── components/
│   ├── ui/                     # shadcn 组件（Badge/Button/Card/Input/ScrollArea/Sheet/Textarea）
│   ├── chat.tsx                # AI 对话组件（核心）
│   ├── note-list.tsx           # 笔记/任务列表组件
│   ├── sidebar.tsx             # 导航（PC 侧栏 + 手机底部栏，10 项）
│   ├── export-button.tsx       # 导出按钮（MD/CSV/JSON）
│   ├── fab-button.tsx          # 悬浮快捷按钮
│   ├── rich-editor.tsx         # 富文本编辑器（基于 TipTap）
│   ├── theme-provider.tsx      # 主题上下文
│   ├── theme-toggle.tsx        # 深色模式切换
│   ├── pwa-handler.tsx         # PWA 安装管理 + 诊断面板
│   ├── page-animation.tsx      # 页面过渡动画容器
│   ├── notification-manager.tsx # 通知提醒管理器
│   └── skeleton-card.tsx       # 骨架屏组件
├── lib/
│   ├── db.ts                   # 数据库操作（双模式 SQLite/Turso，含搜索/标签/统计/清除）
│   ├── types.ts                # TypeScript 类型（Note/Expense/Habit/AIResponse/EntryType）
│   ├── prompts.ts              # AI 系统提示词（6 种输出类型）
│   ├── constants.ts            # 共享常量（类型颜色/分类标签映射）
│   └── utils.ts                # cn() 工具函数
├── store/
│   └── index.ts                # Zustand 全局状态
├── scripts/
│   ├── https-setup.sh          # HTTPS 开发证书一键生成（mkcert）
│   ├── migrate-to-turso.ts     # 本地→Turso 数据迁移
│   ├── setup-turso.ts          # Turso 数据库创建 + 数据迁移一键脚本
│   └── tunnel.sh               # HTTPS 隧道（cloudflared/ngrok/localtunnel）
├── data/
│   └── schema.sql              # 完整 DDL（6 表 + 索引）
└── public/
    ├── manifest.json            # PWA 配置（192+512 图标，maskable）
    ├── sw.js                    # Service Worker（最简 pass-through）
    └── icons/                   # 应用图标
```

## 数据库

`@libsql/client` 直接操作（非 ORM），6 个表：

**notes**（笔记/任务/事件）: id, content, title, type, tags(JSON), due_date, done, created_at, updated_at
- 索引: type, created_at, due_date

**chat_messages**（聊天历史）: id, role, content, related_note_id, created_at

**expenses**（收支）: id, amount, category, description, type, created_at
- 索引: type, created_at

**habits**（习惯）: id, name, description, frequency, created_at

**habit_completions**（打卡）: id, habit_id, date, completed, created_at
- 唯一约束: (habit_id, date)

## AI Prompt 设计

`lib/prompts.ts` 的 SYSTEM_PROMPT 控制 AI 输出。AI 必须返回纯 JSON（无代码围栏）：

```json
{"type":"note|task|event|expense|income|habit","title":"标题","tags":["标签"],"dueDate":"ISO日期|null","summary":"回复","isNewEntry":true|false,"amount":null,"category":null}
```

## WSL2 环境

项目在 WSL2 中开发。WSL2 有独立虚拟 IP（如 `192.168.82.x`），局域网其他设备无法直接访问。

- **PC 开发**：Windows 浏览器 `http://localhost:3000`（自动转发）
- **手机 PWA 安装**：
  1. 生成 HTTPS 证书：`bash scripts/https-setup.sh <Windows-IP>`
  2. 启动：`bash start.sh <Windows-IP>`（如 `192.168.31.111`）
  3. Windows 管理员 PowerShell 端口转发：`.\setup-wsl.ps1`
  4. 手机装 CA：`https://<Windows-IP>:3000/ca.pem`（Android 14+ 需开启 `chrome://flags/#enable-granular-android-pre-14-ca-trust`）
- **备用隧道**：`bash scripts/tunnel.sh`（cloudflared，无需端口转发）

## 启动

```bash
nvm use 24
npm install
bash start.sh              # 自动检测 HTTPS 证书，使用 HTTPS 或 HTTP
npm run build              # 生产构建
```

## 部署

已部署到 **Vercel**：`https://opencode-demo.vercel.app`

### 数据库

使用 **Turso** 云数据库（新加坡 `aps1` 集群）：
- URL: `libsql://lifeos-lijh37.aws-ap-northeast-1.turso.io`
- Agent: `@tursodatabase/api` 创建数据库 + `@libsql/client` 迁移数据
- 密码：`proxy.ts` 中间件验证 `app_auth` cookie

### 环境变量（Vercel 配置）

| 变量 | 说明 |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek AI 推理 |
| `TURSO_DATABASE_URL` | Turso 数据库地址 |
| `TURSO_AUTH_TOKEN` | Turso 认证 Token |
| `APP_PASSWORD` | 登录密码 |

### 重新部署

```bash
git push origin main
# Vercel 自动触发部署
```

### 本地开发

```bash
nvm use 24
npm install
npx vercel env pull .env.local   # 拉取 Vercel 环境变量
npm run dev

## 设计决策

- **产品定位**：AI 管家 + 工具箱，两者都要
- **技术路线**：Web App + PWA 先行，不纠结原生
- **一人开发**，AI 全权负责编码
- **手机为主要设备**，PC 辅助
- **AI 提供商**：DeepSeek API（`DEEPSEEK_API_KEY` 在 `.env.local`）
- **"工作助手"功能**过于通用，已从 roadmap 移除
