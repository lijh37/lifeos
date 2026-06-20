# LifeOS - 项目上下文（会话恢复用）

## 项目概述

个人 AI 生活助手应用，用户通过自然语言与 AI 对话，AI 自动解析为结构化笔记、任务或事件。支持手机端和 PC 端。

## 当前状态（截至 2026-06-20）

### ✅ 已实现

- **AI 对话式记录**：输入自然语言 → DeepSeek 解析 → 自动存入数据库
- **笔记/任务/事件** 三种类型，自动打标签
- **笔记列表页**：按类型筛选、搜索、标记完成、删除
- **任务列表页**：默认过滤为任务视图
- **全局导航**：PC 侧栏 + 手机底部 Tab
- **PWA 配置**：可安装到手机桌面
- **收支管理**：AI 自动记账分类，月度统计
- **习惯养成**：AI 创建习惯 + 每日打卡
- **深色模式**：light/dark/system 三态切换
- **数据导出**：笔记/收支导出 Markdown / JSON
- **响应优化**：打字动画，超时提示，重试按钮

### ❌ 已知问题

- 本地 SQLite 数据尚未迁移到 Turso（已配置双模式连接，需配置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN）

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
app/
  ├── layout.tsx          # 全局布局 + PWA meta
  ├── page.tsx            # AI 对话首页（use client, dynamic import Chat）
  ├── notes/page.tsx      # 笔记列表
  ├── tasks/page.tsx      # 任务列表（默认过滤 task）
  ├── globals.css
  └── api/
      ├── chat/route.ts   # DeepSeek 流式对话
      ├── notes/route.ts  # 笔记 CRUD
      └── notes/[id]/route.ts
components/
  ├── ui/                 # shadcn 组件
  ├── chat.tsx            # AI 对话组件（核心）
  ├── note-list.tsx       # 笔记/任务列表组件
  └── sidebar.tsx         # 导航（PC 侧栏 + 手机底部栏）
lib/
  ├── db.ts               # 数据库操作（@libsql/client）
  ├── types.ts            # TypeScript 类型
  └── prompts.ts          # AI 系统提示词
store/
  └── index.ts            # Zustand 全局状态
public/
  ├── manifest.json       # PWA 配置
  └── icons/              # 应用图标
```

## 数据库

两个表，使用 `@libsql/client` 直接操作（非 ORM）：

**notes**:
- id TEXT PRIMARY KEY
- content TEXT NOT NULL (用户原始输入)
- title TEXT (AI 提取的标题)
- type TEXT NOT NULL DEFAULT 'note' (note | task | event)
- tags TEXT DEFAULT '[]' (JSON 数组)
- due_date TEXT (ISO 日期)
- done INTEGER DEFAULT 0
- created_at TEXT NOT NULL
- updated_at TEXT NOT NULL

**chat_messages**:
- id TEXT PRIMARY KEY
- role TEXT NOT NULL (user | assistant)
- content TEXT NOT NULL
- related_note_id TEXT
- created_at TEXT NOT NULL

## AI Prompt 设计

`lib/prompts.ts` 中的 SYSTEM_PROMPT 控制 AI 输出格式。AI 必须返回纯 JSON：

```json
{"type":"note|task|event","title":"标题","tags":["标签"],"dueDate":"ISO日期|null","summary":"回复","isNewEntry":true|false}
```

## WSL2 环境

项目在 WSL2 中开发。WSL2 有独立虚拟 IP (`192.168.82.x`)，局域网其他设备无法直接访问。

- PC 访问：Windows 浏览器 `http://localhost:3000`（Windows 自动转发）
- 手机访问：需要先在 **Windows 管理员 PowerShell** 执行端口转发：

```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=192.168.82.57
netsh advfirewall firewall add rule name="LifeOS Dev Server" dir=in action=allow protocol=TCP localport=3000
```

助手脚本：`setup-wsl.ps1` / `wsl-port-forward.bat`

手机访问 `http://[Windows本机IP]:3000`（已在 `allowedDevOrigins` 中添加 `192.168.31.111`）

## 已讨论但未实现的需求

### P2 - 后续

1. **工作助手**：会议纪要 + 日报自动生成
2. **饮食+锻炼追踪**：拍照识食物（GPT-4o vision），运动记录
3. **多端同步部署**：设置 TURSO_DATABASE_URL + Vercel 部署

### 优化项

4. **离线支持**：Service Worker 缓存 + IndexedDB 兜底
5. **迭代细节**：习惯 streak 连续天数、记账月图表、导出 CSV 格式

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
