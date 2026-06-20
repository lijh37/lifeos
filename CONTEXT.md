# LifeOS - 项目上下文（会话恢复用）

## 项目概述

个人 AI 生活助手应用，用户通过自然语言与 AI 对话，AI 自动解析为结构化笔记、任务、事件、收支或习惯。支持手机端和 PC 端，深色模式，完整数据导出。

## 当前状态（截至 2026-06-20）

### ✅ 已实现

- **AI 对话式记录**：DeepSeek 解析自然语言 → 自动创建笔记/任务/事件/支出/收入/习惯
- **笔记/任务/事件** 三种类型，自动打标签，按类型筛选、搜索、标记完成
- **收支管理**：AI 自动记账分类（餐饮/交通/购物等），月度汇总 + 分类柱状图
- **习惯养成**：AI 创建习惯 + 每日打卡 + 连续天数 streak 徽章
- **日历视图**：月历网格，彩色圆点标记条目类型，点击展开当日详情
- **深色模式**：light/dark/system 三态切换（localStorage 持久化）
- **数据导出**：笔记/收支导出 Markdown / JSON / CSV（含 BOM，Excel 友好）
- **响应优化**：打字动画，15s 超时提示，重试按钮，复制按钮，60s 服务端 abort
- **全局导航**：PC 侧栏 + 手机底部 Tab（6 项：对话/笔记/任务/记账/习惯/日历）
- **PWA 配置**：manifest.json + 图标
- **Turso 多端同步预备**：`lib/db.ts` 双模式（Turso/local），迁移脚本 `scripts/migrate-to-turso.ts`，`data/schema.sql`

### ❌ 已知问题

- 本地 SQLite 数据尚未迁移到 Turso（已配置双模式连接，需配置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN）
- `note-list.tsx` `useEffect` 缺少 `fetchNotes` 依赖项（无害 warning，非 build error）

## 技术栈

| 层 | 选型 |
|---|---|
| 前端框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| AI | DeepSeek API (`deepseek-v4-flash`) |
| AI SDK | `@ai-sdk/react` + `ai` (v6) |
| 数据库 | `@libsql/client` 本地 SQLite |
| 状态管理 | Zustand |
| 日期处理 | date-fns |
| 图标 | lucide-react |

## AI SDK v6 关键约定

- `useChat` 从 `@ai-sdk/react` 导入（非 `ai/react`）
- 服务端 API Route 使用 `convertToModelMessages`（async）和 `result.toUIMessageStreamResponse()`
- 客户端使用 `DefaultChatTransport` 配置 API 端点
- DeepSeek 需使用 `deepseek.chat('deepseek-v4-flash')`（.chat() 方法走 Chat Completions API，直接调用走 Responses API 不支持）

## 项目结构

```
app/                  # Next.js App Router 页面和 API
  ├── api/chat/       # DeepSeek 流式对话接口
  ├── api/notes/      # 笔记 CRUD 接口
  ├── api/expenses/   # 收支 CRUD 接口
  ├── api/habits/     # 习惯 CRUD 接口（含 streaks）
  ├── api/export/     # 导出（MD/JSON/CSV）
  ├── notes/          # 笔记列表页
  ├── tasks/          # 任务列表页
  ├── expenses/       # 记账页面（月图+分类筛选）
  ├── habits/         # 习惯页面（打卡+streak）
  └── calendar/       # 日历视图页面
components/           # React 组件
  ├── ui/             # shadcn 组件（Badge/Button/Card/Input/ScrollArea/Sheet/Separator/Textarea）
  ├── chat.tsx        # AI 对话组件（核心）
  ├── note-list.tsx   # 笔记/任务列表组件
  ├── sidebar.tsx     # 导航（PC 侧栏 + 手机底部栏）
  ├── export-button.tsx # 导出按钮（MD/JSON/CSV）
  ├── theme-provider.tsx # 主题上下文
  └── theme-toggle.tsx  # 深色模式切换
lib/                  # 核心逻辑
  ├── db.ts           # 数据库操作（@libsql/client）
  ├── types.ts        # TypeScript 类型
  └── prompts.ts      # AI 系统提示词
store/                # Zustand 全局状态
public/
  ├── manifest.json   # PWA 配置
  └── icons/          # 应用图标
scripts/
  └── migrate-to-turso.ts  # 本地→Turso 数据迁移
data/
  └── schema.sql      # 完整 DDL
```

## 数据库

`@libsql/client` 直接操作（非 ORM），6 个表：

**notes**（笔记/任务/事件，通过 type 字段区分）:
- id, content, title, type(note|task|event), tags(JSON), due_date, done, created_at, updated_at
- 索引: type, created_at, due_date

**chat_messages**（聊天记录）:
- id, role(user|assistant), content, related_note_id, created_at

**expenses**（收支记录）:
- id, amount, category(餐饮|交通|购物|娱乐|医疗|教育|住房|工资|其他), description, type(expense|income), created_at
- 索引: type, created_at

**habits**（习惯）:
- id, name, description, frequency(daily|weekly), created_at

**habit_completions**（打卡记录）:
- id, habit_id, date(YYYY-MM-DD), completed(0|1), created_at
- 唯一约束: (habit_id, date)，复合索引

## AI Prompt 设计

`lib/prompts.ts` 中的 SYSTEM_PROMPT 控制 AI 输出格式。AI 必须返回纯 JSON（无代码围栏）：

```json
{"type":"note|task|event|expense|income|habit","title":"标题","tags":["标签"],"dueDate":"ISO日期|null","summary":"回复","isNewEntry":true|false,"amount":null,"category":null}
```

## WSL2 环境

项目在 WSL2 中开发。WSL2 有独立虚拟 IP (`192.168.82.x`)，局域网其他设备无法直接访问。

- PC 访问：Windows 浏览器 `http://localhost:3000`（Windows 自动转发）
- 手机访问：需在 **Windows 管理员 PowerShell** 执行端口转发：
```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=192.168.82.57
netsh advfirewall firewall add rule name="LifeOS Dev Server" dir=in action=allow protocol=TCP localport=3000
```
助手脚本：`setup-wsl.ps1` / `wsl-port-forward.bat`
手机访问 `http://[Windows本机IP]:3000`（已在 `allowedDevOrigins` 中添加 `192.168.31.111`）

## 待实现需求

| 优先级 | 功能 | 备注 |
|---|---|---|
| P1 | **多端同步部署** | 注册 Turso → `npm run migrate` → 部署 Vercel |
| P2 | **离线支持** | Service Worker + IndexedDB 兜底 |
| P3 | **饮食+锻炼追踪** | 拍照识食物（需 GPT-4o vision API key） |
| P4 | **迭代优化** | 数据看板、搜索、设置页、动效 |

## 启动方式

```bash
cd /home/demo/project/opencode-demo
npm run dev
```

访问 `http://localhost:3000`

## 部署

目标部署平台：Vercel（免费）。部署前需迁移数据库到 Turso（serverless SQLite）以支持生产环境。

## 已讨论的方案

- 产品定位：AI 管家 + 工具箱 两者都要
- 技术路线：Web App + PWA 先行，不纠结原生
- 数据加密：简单模式（HTTPS + 服务端加密）
- 一人开发，AI 全权负责编码
- 手机为主要设备，PC 辅助
- AI 提供商：DeepSeek API（Key 在 `.env.local`）
- "工作助手"功能过于通用，无明确使用场景，已从 roadmap 移除
