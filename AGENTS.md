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
  ├── api/notes/reorder/ # 拖拽排序
  ├── api/budgets/    # 预算 CRUD
  ├── api/habits/     # 习惯 CRUD（含 streaks、趋势、统计）
  ├── api/export/     # 导出（MD/JSON/CSV）
  ├── api/search/     # 跨类型搜索
  ├── api/tags/       # 标签管理
  ├── api/settings/   # 数据统计 + 批量清除
  ├── api/import/     # JSON 备份导入
  ├── api/stats/      # 聚合统计（含习惯趋势）
  ├── api/auth/       # 密码验证
  ├── notes/          # 笔记列表页（批量选择+拖拽排序）
  ├── expenses/       # 月度预算页
  ├── habits/         # 习惯页面
  ├── search/         # 全局搜索
  ├── tags/           # 标签管理
  ├── stats/          # 统计看板
  ├── settings/       # 设置页
  └── login/          # 登录页
components/           # React 组件
  ├── ui/             # shadcn 基础组件（Badge/Button/Card/Checkbox/Input/ScrollArea/Sheet/Textarea）
  ├── chat.tsx        # AI 对话组件（核心）
  ├── note-list.tsx   # 笔记列表（批量操作+拖拽排序+搜索）
  ├── markdown-editor.tsx # Markdown 编辑器（分栏编辑 + 工具栏 + 自动保存）
  ├── sidebar.tsx     # 导航（PC 侧栏 + 手机底部栏，8 项）
  ├── fab-button.tsx  # 悬浮快捷按钮（可拖拽）
  ├── export-button.tsx # 导出按钮（MD/JSON）
  ├── auto-backup.tsx # 自动备份钩子 + 管理面板
  ├── command-menu.tsx   # ⌘K 命令面板（导航+搜索+快捷操作）
  ├── error-boundary.tsx # React Error Boundary（笔记/习惯页面）
  ├── theme-provider.tsx # 主题上下文
  ├── theme-toggle.tsx  # 深色模式切换
  ├── pwa-handler.tsx   # PWA 安装管理 + 诊断面板
  ├── page-animation.tsx # 页面过渡动效
  └── skeleton-card.tsx  # 骨架屏组件（NoteList/Habits/Chat 三种变体）
lib/                  # 核心逻辑
  ├── db.ts           # 数据库操作（9 表，搜索/标签/统计/清除/习惯趋势）
  ├── types.ts        # TypeScript 类型定义（Note/Habit/AIResponse/Conversation）
  ├── ai-tools.ts     # AI Function Calling 工具定义（5 个查询工具）
  ├── prompts.ts      # AI 系统提示词
  ├── constants.ts    # 共享常量（类型颜色/分类标签映射）
  ├── rate-limiter.ts # 内存限流器（/api/chat 用）
  └── utils.ts        # cn() 工具函数（clsx + tailwind-merge）
store/                # Zustand 全局状态
scripts/
  └── tunnel.sh             # HTTPS 隧道启动（cloudflared/ngrok/localtunnel）
data/                 # 本地 SQLite 数据目录（gitignored）
e2e/                  # Playwright E2E 测试（TODO：待编写测试用例）
  └── playwright.config.ts # 配置
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

使用 `@libsql/client` 直接操作，9 个表：
- `notes` — 笔记
- `chat_messages` — 聊天历史（持久化存储）
- `conversations` — 对话会话管理
- `budgets` — 月度预算
- `habits` + `habit_completions` — 习惯打卡
- `attachments` — 笔记附件
- `tags` + `note_tags` — 规范化标签关联
- 详情见 `lib/db.ts` 的 `initDB()`

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
2. 在 `lib/db.ts` 添加数据库操作方法
3. 在 `lib/prompts.ts` 更新 AI Prompt 以支持新功能
4. 在 `app/` 下创建新页面
5. 在 `components/sidebar.tsx` 添加导航项
6. 构建验证：`npm run build`

## 测试

```bash
npm test        # vitest 单元测试
npm run test:e2e # Playwright E2E
```
