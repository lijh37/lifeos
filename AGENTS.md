<!-- LifeOS - AI 生活助手 -->

# 项目概况

> 首次进入会话请先阅读 `CONTEXT.md` 获取完整上下文。

LifeOS 是一个个人 AI 生活助手应用。用户通过自然语言与 AI 对话，AI 自动解析为结构化笔记、任务、事件或习惯。

## 技术栈

- Next.js 16 (App Router), TypeScript
- Tailwind CSS + shadcn/ui (UI 组件)
- DeepSeek API (AI 推理)
- @libsql/client (数据库，双模式 SQLite/Turso)
- Zustand (客户端状态管理)
- date-fns v4 (日期处理)
- lucide-react (图标)

## 目录结构

```
app/                  # Next.js App Router 页面和 API
  ├── api/chat/       # DeepSeek 流式对话接口
  ├── api/notes/      # 笔记 CRUD 接口
  ├── api/notes/[id]/ # 单条笔记操作
  ├── api/budgets/    # 预算 CRUD
  ├── api/habits/     # 习惯 CRUD（含 streaks）
  ├── api/export/     # 导出（MD/JSON/CSV）
  ├── api/search/     # 跨类型搜索
  ├── api/tags/       # 标签管理
  ├── api/settings/   # 数据统计 + 批量清除
  ├── api/import/     # JSON 备份导入
  ├── api/stats/      # 聚合统计
  ├── api/auth/       # 密码验证
  ├── notes/          # 笔记列表页
  ├── tasks/          # 任务列表页
  ├── expenses/       # 月度预算页
  ├── habits/         # 习惯页面
  ├── calendar/       # 日历视图页面
  ├── search/         # 全局搜索
  ├── tags/           # 标签管理
  ├── stats/          # 统计看板
  ├── settings/       # 设置页
  └── login/          # 登录页
components/           # React 组件
  ├── ui/             # shadcn 基础组件（Badge/Button/Card/Checkbox/Input/ScrollArea/Sheet/Textarea）
  ├── chat.tsx        # AI 对话组件（核心）
  ├── note-list.tsx   # 笔记/任务列表（含 RichEditor 编辑）
  ├── rich-editor.tsx # 富文本编辑器（基于 TipTap）
  ├── sidebar.tsx     # 导航（PC 侧栏 + 手机底部栏，10 项）
  ├── fab-button.tsx  # 悬浮快捷按钮（可拖拽）
  ├── export-button.tsx # 导出按钮（MD/JSON/CSV）
  ├── theme-provider.tsx # 主题上下文
  ├── theme-toggle.tsx  # 深色模式切换
  ├── pwa-handler.tsx   # PWA 安装管理 + 诊断面板
  ├── notification-manager.tsx # 通知提醒（到期检查 + 浏览器推送）
  ├── page-animation.tsx # 页面过渡动效
  └── skeleton-card.tsx  # 骨架屏组件
lib/                  # 核心逻辑
  ├── db.ts           # 数据库操作（5 表，搜索/标签/统计/清除）
  ├── types.ts        # TypeScript 类型定义（Note/Budget/Habit/AIResponse）
  ├── prompts.ts      # AI 系统提示词（4 种输出类型）
  ├── constants.ts    # 共享常量（类型颜色/分类标签映射）
  └── utils.ts        # cn() 工具函数（clsx + tailwind-merge）
store/                # Zustand 全局状态
scripts/
  ├── https-setup.sh        # HTTPS 开发证书生成（mkcert）
  ├── migrate-to-turso.ts   # 数据迁移脚本
  ├── setup-turso.ts        # Turso 数据库创建 + 迁移一键脚本
  ├── list-turso.ts         # Turso 数据列表
  └── tunnel.sh             # HTTPS 隧道启动（cloudflared/ngrok/localtunnel）
data/
  └── schema.sql      # 完整 DDL（5 表）
public/
  ├── manifest.json   # PWA 配置
  ├── sw.js           # Service Worker
  └── icons/          # 应用图标（PNG 格式）
```

## 关键约定

### AI 对话格式

AI 回复必须是纯 JSON 格式，由 `lib/prompts.ts` 中的 SYSTEM_PROMPT 控制：

```json
{"type":"note|task|event|habit","title":"标题","tags":["标签"],"dueDate":"ISO日期|null","summary":"回复","isNewEntry":true|false}
```

### 数据库

使用 `@libsql/client` 直接操作，5 个表：
- `notes` — 笔记/任务/事件（通过 type 字段区分）
- `chat_messages` — 聊天历史（DB 保留，无运行时读写）
- `budgets` — 月度预算（固定/浮动支出，实际对比，打卡）
- `habits` + `habit_completions` — 习惯打卡
- 详情见 `lib/db.ts` 的 `initDB()` 和 `data/schema.sql`

### AI SDK 版本

使用 AI SDK v6（`@ai-sdk/react` + `ai`），注意：
- `useChat` 从 `@ai-sdk/react` 导入（非 `ai/react`）
- 服务端使用 `convertToModelMessages`（async）和 `toUIMessageStreamResponse()`
- 客户端使用 `DefaultChatTransport` 配置 API 端点
- 消息内容通过 `message.parts` 获取（而非 `message.content`）

### UI 动效约定

- 页面过渡：`PageAnimation` 组件基于 `useSelectedLayoutSegment` 实现 key 变化触发 fadeIn
- 列表交错：容器加 `animate-stagger`，子项自动延迟
- 骨架屏：使用 `SkeletonCard` 组件替代手动 Loader2
- 卡片悬浮：列表中的 Card 统一加 `card-hover` 类
- 日历圆点：`typeDotColors` 支持 note/task/event/habit 四种类型颜色

### PWA 安装约定

- `public/sw.js`：最简 Service Worker（install→skipWaiting, activate→clients.claim, fetch→pass-through）
- `public/manifest.json`：standalone 模式，192x192 + 512x512 PNG 图标（SVG 已弃用）
- `components/pwa-handler.tsx`：beforeinstallprompt 用 useRef 保存（不用 state）以保证手势上下文；安装按钮用 onPointerDown 同步触发 prompt()
- 诊断面板：右上角 Bug 图标，`?debug=1` 自动展开
- 测试命令：`bash scripts/tunnel.sh` 创建 HTTPS 隧道供手机安装

## 部署

- **生产环境**：`https://opencode-demo.vercel.app`（Vercel）
- **云端数据库**：Turso（`libsql://lifeos-lijh37.aws-ap-northeast-1.turso.io`）
- **密码保护**：`proxy.ts` 中间件 + `/login` 页 + `/api/auth` 接口（`APP_PASSWORD` 环境变量）

## WSL2 环境说明

本项目运行在 WSL2 中，WSL2 有独立的虚拟 IP（如 `192.168.82.x`），无法从局域网其他设备直接访问。

- **PC 端开发**：Windows 浏览器打开 `http://localhost:3000`（Windows 自动转发到 WSL2）
- **手机端测试**：执行 `bash scripts/https-setup.sh` 生成 HTTPS 证书后，手机可直接访问 `https://<LAN-IP>:3000` 安装 PWA；或执行 `setup-wsl.ps1` 端口转发后用 `bash scripts/tunnel.sh` 创建 HTTPS 隧道
- **生产部署**：`git push origin main` → Vercel 自动部署

## 添加新模块

1. 在 `lib/types.ts` 扩展类型（如果需要）
2. 在 `lib/db.ts` 添加数据库操作方法
3. 在 `lib/prompts.ts` 更新 AI Prompt 以支持新功能
4. 在 `app/` 下创建新页面
5. 在 `components/sidebar.tsx` 添加导航项
6. 构建验证：`npm run build`
