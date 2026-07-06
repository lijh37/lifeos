<!-- LifeOS - AI 生活助手 -->

# 项目概况

> 首次进入会话请先阅读 `CONTEXT.md` 获取完整上下文。

LifeOS 是一个个人 AI 生活助手应用。用户通过自然语言与 AI 对话，AI 可查询笔记、习惯和预算数据并回答用户问题。（当前模式：AI 只查不写）

## 技术栈

- Next.js 16 (App Router), TypeScript
- Tailwind CSS + shadcn/ui (UI 组件)
- DeepSeek API (AI 推理)
- @libsql/client (数据库，SQLite/Turso)
- Zustand (客户端状态管理)
- date-fns v4 (日期处理)
- lucide-react (图标)

## 目录结构

```
app/                  # Next.js App Router 页面和 API
  ├── api/chat/       # DeepSeek 流式对话接口（含限流）
  ├── api/chat/history/ # 聊天历史 CRUD
  ├── api/conversations/ # 对话管理
  ├── api/notes/      # 笔记 CRUD 接口
  ├── api/notes/[id]/ # 单条笔记操作
  ├── api/notes/batch/ # 批量操作（删除/加标签）
  ├── api/budgets/    # 预算 CRUD
  ├── api/habits/     # 习惯 CRUD（含 streaks、趋势、统计）
  ├── api/export/     # 导出（MD/JSON/CSV）
  ├── api/tags/       # 标签管理
  ├── api/settings/   # 数据统计 + 批量清除
  ├── api/import/     # JSON 备份导入
  ├── api/stats/      # 聚合统计（含习惯趋势）
  ├── api/auth/       # 密码验证
  ├── notes/          # 笔记列表页（批量选择+搜索+置顶+无限滚动）
  │   └── [id]/       # 笔记详情页（编辑器 + 标题/标签/删除）
  │       ├── loading.tsx # 详情页加载骨架屏
  │       ├── note-detail-client.tsx # 客户端交互
  │       └── page.tsx    # 服务端组件
  ├── expenses/       # 月度预算页
  ├── habits/         # 习惯页面
  ├── tags/           # 标签管理
  ├── stats/          # 统计看板
  ├── settings/       # 设置页
  └── login/          # 登录页
components/             # React 组件
  ├── ui/               # shadcn 基础组件
  ├── chat.tsx          # AI 对话包装（ChatProvider + ChatInner 布局）
  ├── chat-context.tsx  # ChatContext（useChat + 对话管理 + 消息持久化）
  ├── chat-input.tsx    # 输入框（auto-resize + Enter/Shift+Enter）
  ├── conversation-sidebar.tsx # 对话历史侧栏
  ├── message-list.tsx  # 消息气泡列表（UserMessage + AssistantMessage 已 memo）
  ├── note-list.tsx     # 笔记列表（批量操作 + 搜索 + 置顶 + 按标签筛选 + 无限滚动，NoteCard 已 memo）
  ├── markdown-editor.tsx # Markdown 编辑器（分栏编辑 + 工具栏 + 自动保存）
  ├── sidebar.tsx       # 导航（PC 侧栏 + 手机底部栏，7 项，使用 lib/navigation）
  ├── export-button.tsx # 导出按钮（MD/JSON）
  ├── auto-backup.tsx   # 自动备份钩子 + 管理面板
  ├── error-boundary.tsx # React Error Boundary
  ├── theme-provider.tsx # 主题上下文
  ├── theme-toggle.tsx  # 深色模式切换
  ├── pwa-handler.tsx   # PWA 安装管理 + 诊断面板（无 as any）
  ├── page-animation.tsx # 页面过渡动效（fadeIn key 驱动）
  └── skeleton-card.tsx # 骨架屏（NoteList/Habits/Chat 三种变体）
lib/                    # 核心逻辑
  ├── db/               # 数据库模块（模块化，通过 index.ts 重导出）
  │   ├── client.ts     # getClient() + initDB()（含所有 DDL）
  │   ├── notes.ts      # 笔记 CRUD + 搜索 + 分页
  │   ├── habits.ts     # 习惯 CRUD + 打卡 + 连续天数 + 趋势
  │   ├── budgets.ts    # 预算 CRUD（upsert）
  │   ├── chat.ts       # 对话/消息 CRUD
  │   ├── tags.ts       # 标签管理 + syncNoteTags
  │   ├── attachments.ts # 附件操作
  │   └── index.ts      # 重导出（import from '@/lib/db' 不变）
  ├── types.ts          # TypeScript 类型（Note/Habit/AIResponse/Conversation）
  ├── ai-tools.ts       # AI Function Calling 工具定义（5 个查询工具）
  ├── prompts.ts        # AI 系统提示词
  ├── markdown.tsx      # MarkdownRenderer（react-markdown + Tailwind 样式）
  ├── constants.ts      # 共享常量（类型颜色/分类标签映射）
    ├── navigation.ts     # 共享导航配置（NAV_ITEMS / PRIMARY_MOBILE_NAV）
  ├── rate-limiter.ts   # 内存限流器
  └── utils.ts          # cn() + genId() 等工具函数
store/                  # Zustand 全局状态
  ├── index.ts          # useAppStore（笔记分页缓存）+ useUIStore（UI 状态）
  └── __tests__/        # 状态管理测试（12 测试）
scripts/
  └── tunnel.sh         # HTTPS 隧道启动（cloudflared/ngrok/localtunnel）
data/                   # 本地 SQLite 数据目录（gitignored）
lib/__tests__/             # 库测试
  ├── db.test.ts        # 数据库测试（含标签操作）
  ├── chat.test.ts      # 聊天 CRUD 测试
  ├── rate-limiter.test.ts # 内存限流器测试
  └── utils.test.ts     # 工具函数测试
store/__tests__/           # 状态管理测试
  └── index.test.ts
components/__tests__/      # 组件测试
  ├── note-list.test.tsx # 笔记列表组件测试
  └── budget-habit.test.tsx # 预算/习惯组件测试
e2e/                    # Playwright E2E 测试（TODO）
  └── playwright.config.ts
public/
  ├── manifest.json   # PWA 配置
  ├── sw.js           # Service Worker
  └── icons/          # 应用图标（PNG 格式）
```

## 关键约定

### AI 对话格式

AI 回复使用自然语言，由 `lib/prompts.ts` 中的 SYSTEM_PROMPT 控制。AI 通过 Function Calling（`lib/ai-tools.ts`）查询笔记、习惯和预算数据，然后以中文自然语言回复用户。

AI 当前为**只查不写**模式，不会自动创建笔记/任务/事件/习惯。

### 数据库

使用 `@libsql/client` 直接操作，9 个表（支持置顶 `pinned` 字段）：
- `notes` — 笔记
- `chat_messages` — 聊天历史（持久化存储）
- `conversations` — 对话会话管理
- `budgets` — 月度预算
- `habits` + `habit_completions` — 习惯打卡
- `attachments` — 笔记附件
- `tags` + `note_tags` — 规范化标签关联
- 详情见 `lib/db/client.ts` 的 `initDB()`

### AI SDK 版本

使用 AI SDK v7（`@ai-sdk/react` + `ai`），注意：
- `useChat` 从 `@ai-sdk/react` 导入（非 `ai/react`）
- 服务端使用 `convertToModelMessages`（async）和 `toUIMessageStreamResponse()`
- 客户端使用 `DefaultChatTransport` 配置 API 端点
- 消息内容通过 `message.parts` 获取（而非 `message.content`）
- Function Calling: `tool()` + `zod` 定义工具，`streamText({ tools })` 执行

### UI 动效约定

- 页面过渡：`PageAnimation` 组件基于 `useSelectedLayoutSegment` 实现 key 变化触发 fadeIn
- 列表交错：容器加 `animate-stagger`，子项自动延迟
- 骨架屏：使用 `SkeletonCard` / `SkeletonNoteList` / `SkeletonHabits` / `SkeletonChat` 替代手动 Loader2
- 卡片悬浮：列表中的 Card 统一加 `card-hover` 类

### 状态管理

- `useAppStore`（`store/index.ts`）：笔记列表缓存（cursor 分页，MAX_CACHED_NOTES=500），用于 note-list 组件
- `useUIStore`（`store/index.ts`）：跨页面共享 UI 状态（isMobileMenuOpen）
- `ChatContext`（`components/chat-context.tsx`）：对话专用上下文（useChat + 对话 CRUD + 消息持久化），不混入 Zustand

### 性能优化约定

- 列表项组件统一加 `React.memo` + `displayName`（NoteCard, BudgetCard, HabitRow, UserMessage, AssistantMessage, ConversationSidebar 等）
- 传递给子组件的回调函数统一用 `useCallback` 包装
- 新组件提取后遵循：功能性函数（如 ProgressBar）→ 模块级函数；有状态的 → 独立函数组件

### PWA 安装约定

- `public/sw.js`：多缓存策略 Service Worker（pre-cache 静态页面，Next.js 静态资源 cache-first，API 请求 network-only，导航请求 network-first with cache fallback）
- `public/manifest.json`：standalone 模式，192x192 + 512x512 PNG 图标（SVG 已弃用）
- `components/pwa-handler.tsx`：beforeinstallprompt 用 useRef 保存（不用 state）以保证手势上下文；安装按钮用 onPointerDown 同步触发 prompt()
- 诊断面板：右上角 Bug 图标，`?debug=1` 自动展开
- 测试命令：`bash scripts/tunnel.sh` 创建 HTTPS 隧道供手机安装

## 部署

- **生产环境**：`https://opencode-demo.vercel.app`（Vercel）
- **云端数据库**：Turso（`libsql://lifeos-lijh37.aws-ap-northeast-1.turso.io`）
- **密码保护**：`proxy.ts`（Next.js 16 中间件）+ `/login` 页 + `/api/auth` 接口（`APP_PASSWORD` 环境变量）；API 请求支持 `Authorization: Bearer` 头

## WSL2 环境说明

本项目运行在 WSL2 中，WSL2 有独立的虚拟 IP（如 `192.168.82.x`），无法从局域网其他设备直接访问。

- **PC 端开发**：Windows 浏览器打开 `http://localhost:3000`（Windows 自动转发到 WSL2）
- **手机端测试**：执行 `bash start.sh` 生成 HTTPS 证书后，手机可直接访问 `https://<LAN-IP>:3000` 安装 PWA；或执行 `setup-wsl.ps1` 端口转发后用 `bash scripts/tunnel.sh` 创建 HTTPS 隧道
- **生产部署**：`git push origin main` → Vercel 自动部署

## 添加新模块

1. 在 `lib/types.ts` 扩展类型（如果需要）
2. 在 `lib/db/` 下对应文件添加数据库操作方法（或新建模块文件并在 index.ts 重导出）
3. 在 `lib/prompts.ts` 更新 AI Prompt 以支持新功能
4. 在 `app/` 下创建新页面
5. 在 `lib/navigation.ts` 添加导航项
6. 构建验证：`npm run build`

## 测试

```bash
npm test        # vitest 单元测试（7 文件，69 测试）
npm run test:e2e # Playwright E2E（TODO）
```
