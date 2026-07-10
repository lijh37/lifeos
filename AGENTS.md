<!-- LifeOS - 生活助手 -->

# 项目概况

> 首次进入会话请先阅读 `CONTEXT.md` 获取完整上下文。

LifeOS 是一个个人生活助手应用。支持笔记管理、预算规划和习惯养成。

## 技术栈

- Next.js 16 (App Router), TypeScript
- Tailwind CSS + shadcn/ui (UI 组件)
- @libsql/client (数据库，Turso 云端)
- Zustand (客户端状态管理)
- date-fns v4 (日期处理)
- lucide-react (图标)

## 目录结构

```
app/                  # Next.js App Router 页面和 API
  ├── api/notes/      # 笔记 CRUD 接口
  │   ├── route.ts    # 列表（搜索+分页）
  │   ├── [id]/       # 单条笔记操作
  │   └── batch/      # 批量操作（删除/加标签）
  ├── api/budgets/    # 预算 CRUD
  ├── api/habits/     # 习惯 CRUD（含 streaks、趋势、统计）
  ├── api/backup/     # 备份导出/恢复 JSON
  ├── api/tags/       # 标签管理
  ├── api/search/     # 全文搜索
  ├── api/export/     # 导出（Markdown / JSON）
  ├── api/import/     # 导入
  ├── api/settings/   # 设置
  ├── api/auth/       # 密码验证
  ├── notes/          # 笔记列表页（批量选择+搜索+置顶+无限滚动）
  │   └── [id]/       # 笔记详情页（编辑器 + 标题/标签/删除）
  │       ├── loading.tsx # 详情页加载骨架屏
  │       ├── note-detail-client.tsx # 客户端交互
  │       └── page.tsx    # 服务端组件
  ├── expenses/       # 月度预算页
  ├── habits/         # 习惯页面
  ├── tags/           # 标签管理
  ├── settings/       # 备份与恢复
  └── login/          # 登录页
components/             # React 组件
  ├── ui/               # shadcn 基础组件
  ├── note-list.tsx     # 笔记列表（批量操作 + 搜索 + 置顶 + 按标签筛选 + 无限滚动，NoteCard 已 memo）
  ├── markdown-editor.tsx # Markdown 编辑器（分栏编辑 + 工具栏 + 自动保存）
  ├── sidebar.tsx       # 导航（PC 侧栏 + 手机底部栏，5 项，使用 lib/navigation）
  ├── error-boundary.tsx # React Error Boundary
  ├── theme-provider.tsx # 主题上下文
  ├── theme-toggle.tsx  # 深色模式切换
  ├── pwa-handler.tsx   # PWA 安装管理 + 诊断面板（无 as any）
  ├── page-animation.tsx # 页面过渡动效（fadeIn key 驱动）
  └── skeleton-card.tsx # 骨架屏（NoteList/Habits 两种变体）
lib/                    # 核心逻辑
  ├── db/               # 数据库模块（模块化，通过 index.ts 重导出）
  │   ├── client.ts     # getClient() + initDB()（含所有 DDL）
  │   ├── notes.ts      # 笔记 CRUD + 搜索 + 分页
  │   ├── habits.ts     # 习惯 CRUD + 打卡 + 连续天数 + 趋势
  │   ├── budgets.ts    # 预算 CRUD（upsert）
  │   ├── tags.ts       # 标签管理 + syncNoteTags
  │   ├── attachments.ts # 附件操作
  │   └── index.ts      # 重导出（import from '@/lib/db' 不变）
  ├── types.ts          # TypeScript 类型（Note/Habit/Budget）
  ├── markdown.tsx      # MarkdownRenderer（react-markdown + Tailwind 样式）
  ├── constants.ts      # 共享常量（类型颜色/分类标签映射）
  ├── navigation.ts     # 共享导航配置（NAV_ITEMS / PRIMARY_MOBILE_NAV）
  └── utils.ts          # cn() + genId() 等工具函数
store/                  # Zustand 全局状态
  ├── index.ts          # useAppStore（笔记分页缓存）+ useUIStore（UI 状态）
  └── __tests__/        # 状态管理测试（10 测试）
scripts/
  └── tunnel.sh         # HTTPS 隧道启动（cloudflared/ngrok/localtunnel）
lib/__tests__/             # 库测试
  ├── db.test.ts        # 数据库测试（27 测试）
  └── utils.test.ts     # 工具函数测试（5 测试）
components/__tests__/      # 组件测试
  ├── note-list.test.tsx # 笔记列表组件测试（5 测试）
  └── budget-habit.test.tsx # 预算/习惯组件测试（10 测试）
public/
  ├── manifest.json   # PWA 配置
  ├── sw.js           # Service Worker
  └── icons/          # 应用图标（PNG 格式）
```

## 关键约定

### 数据库

使用 `@libsql/client` 直接操作，7 个表（支持置顶 `pinned` 字段）：
- `notes` — 笔记（含 FTS5 全文索引）
- `budgets` — 月度预算
- `habits` + `habit_completions` — 习惯打卡
- `attachments` — 笔记附件
- `tags` + `note_tags` — 规范化标签关联
- 详情见 `lib/db/client.ts` 的 `initDB()`

### UI 动效约定

- 页面过渡：`PageAnimation` 组件基于 `useSelectedLayoutSegment` 实现 key 变化触发 fadeIn
- 列表交错：容器加 `animate-stagger`，子项自动延迟
- 骨架屏：使用 `SkeletonCard` / `SkeletonNoteList` / `SkeletonHabits` 替代手动 Loader2
- 卡片悬浮：列表中的 Card 统一加 `card-hover` 类

### 状态管理

- `useAppStore`（`store/index.ts`）：笔记列表缓存（cursor 分页，MAX_CACHED_NOTES=500），用于 note-list 组件
- `useUIStore`（`store/index.ts`）：跨页面共享 UI 状态（isMobileMenuOpen）

### 性能优化约定

- 列表项组件统一加 `React.memo` + `displayName`（NoteCard, BudgetCard, HabitRow 等）
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
3. 在 `app/` 下创建新页面
4. 在 `lib/navigation.ts` 添加导航项
5. 构建验证：`npm run build`

## 测试

```bash
npm test        # vitest 单元测试（5 文件，52 测试）
npm run test:e2e # Playwright E2E（TODO）
```
