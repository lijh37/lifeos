# LifeOS — 技术参考

> 面向 AI Agent 的完整项目技术文档。AI 只需读此一份即可理解项目。

## 项目概述

LifeOS 是个人生活助手 PWA，支持笔记管理、预算规划、习惯养成。

- **定位**: 单用户、自托管优先、无外部服务依赖
- **架构**: Next.js 16 App Router 单体（SSR + API Routes 同仓）
- **认证**: 无状态 HMAC（`crypto.subtle.sign`），无 session store
- **数据库**: `@libsql/client` 双模（本地 SQLite / 远程 Turso），`getClient()` 单例切换
- **存储**: 驱动抽象（Vercel Blob / 本地磁盘），`STORAGE_DRIVER` 切换
- **部署**: 双生产环境（阿里云 ECS Docker + Vercel 备用），数据独立

## 目录结构

```
opencode-demo/
├── app/                          # Next.js App Router
│   ├── globals.css               # Tailwind + CSS 变量 + fadeIn/pulse-soft 动画
│   ├── layout.tsx                # 根布局（Sidebar + MobileNav + PwaHandler + Toast）
│   ├── page.tsx                  # 首页 → /notes 重定向
│   ├── login/                    # 登录页（POST /api/auth）
│   ├── notes/                    # 笔记列表 + 详情（RSC + Suspense）
│   ├── expenses/                 # 月度预算页
│   ├── habits/                   # 习惯打卡页
│   ├── settings/                 # 备份导出/恢复 JSON
│   ├── favicon.ico
│   └── api/
│       ├── auth/route.ts         # POST 密码登录 → app_auth cookie
│       ├── notes/route.ts        # GET 列表/搜索/分页, POST 创建, DELETE
│       ├── notes/[id]/route.ts   # GET/PUT/DELETE 单条
│       ├── notes/[id]/attachments/route.ts # 附件上传/列表/删除
│       ├── notes/batch/route.ts  # 批量删除/加标签（事务性）
│       ├── budgets/route.ts      # GET/POST 预算 upsert
│       ├── habits/route.ts       # 习惯 CRUD + 打卡 + streaks + 趋势
│       ├── tags/route.ts         # GET 标签列表, PUT 重命名, DELETE
│       ├── backup/route.ts       # GET 导出 JSON, POST 恢复 JSON
│       └── export/route.ts       # GET 导出全部笔记为 Markdown
├── components/
│   ├── ui/                       # @base-ui/react 封装（Button/Card/Input/Checkbox 等）
│   ├── note-list.tsx             # 笔记列表（搜索+标签筛选+无限滚动+批量操作）
│   ├── note-card.tsx             # 单条笔记卡片（React.memo）
│   ├── batch-actions-bar.tsx     # 批量操作栏（next/dynamic 懒加载）
│   ├── tag-manager-sheet.tsx     # 标签管理 Sheet（next/dynamic 懒加载）
│   ├── attachment-section.tsx    # 附件区（next/dynamic 懒加载）
│   ├── markdown-editor.tsx       # Markdown 编辑器（next/dynamic 懒加载）
│   ├── sidebar.tsx               # 导航侧栏 + 手机底部栏
│   ├── budget-card.tsx           # 预算卡片（React.memo）
│   ├── budget-form.tsx           # 预算表单（React.memo）
│   ├── progress-bar.tsx          # 进度条三色区（React.memo）
│   ├── habit-row.tsx             # 习惯行（React.memo）
│   ├── page-animation.tsx        # 页面过渡动效（fadeIn）
│   ├── route-loading-bar.tsx     # 全局路由加载进度条
│   ├── pwa-handler.tsx           # PWA 注册 + 离线横幅（React.memo）
│   ├── error-boundary.tsx        # React Error Boundary（含重试）
│   ├── format-note-date.ts       # 中文相对时间格式化
│   └── markdown-renderer.tsx     # MarkdownRenderer
├── lib/
│   ├── types.ts                  # TypeScript 接口（Note/Budget/Habit/Attachment）
│   ├── utils.ts                  # cn() + genId() + formatFileSize()
│   ├── auth-token.ts             # HMAC token 派生与验证（Web Crypto API）
│   ├── storage.ts                # 存储驱动抽象（VercelBlobDriver / LocalDiskDriver）
│   ├── markdown.tsx              # MarkdownRenderer 组件
│   ├── strip-markdown.ts         # 纯函数剥离 Markdown
│   ├── navigation.ts             # 共享导航配置（NAV_ITEMS 4 项）
│   └── db/
│       ├── client.ts             # getClient() 单例连接管理
│       ├── migrate.ts            # 迁移执行器
│       ├── index.ts              # 重导出
│       ├── notes.ts              # 笔记 CRUD + LIKE 搜索 + 游标分页
│       ├── habits.ts             # 习惯 CRUD + 打卡 + streaks + 统计
│       ├── budgets.ts            # 预算 upsert
│       ├── tags.ts               # 标签同步 + 重命名 + 删除（支持外部事务）
│       └── attachments.ts        # 附件 CRUD
├── __tests__/                    # 单元测试
│   ├── lib/                      # db.test.ts / markdown.test.tsx / utils.test.ts / streaks.test.ts
│   ├── app/api/                  # routes.test.ts（API 路由 + 认证守卫）
│   ├── components/               # note-list / budget-habit / markdown-editor / attachment-section / batch-actions-bar / tag-manager-sheet
│   └── store/                    # index.test.ts（Zustand 11 测试）
├── store/
│   ├── index.ts                  # useAppStore（Zustand，笔记缓存 MAX=500）
│   └── __tests__/                # 状态管理测试（11 测试）
├── e2e/                          # Playwright E2E
│   ├── smoke.spec.ts             # 登录重定向 + PWA manifest
│   ├── notes.spec.ts             # 笔记 CRUD + 搜索 + 标签 + 置顶
│   ├── budgets.spec.ts           # 预算设置 + 结算
│   └── habits.spec.ts            # 习惯创建/打卡/删除
├── migrations/
│   └── 001_create_tables.sql     # 7 表 + 索引 DDL
├── scripts/
│   └── migrate.ts                # 迁移 CLI（npm run migrate）
├── public/
│   ├── manifest.json             # PWA manifest（standalone, portrait）
│   ├── sw.js                     # Service Worker（静态资源预缓存）
│   ├── icons/                    # 192x192, 512x512 PNG（含 maskable）
│   └── uploads/notes/            # 本地存储附件目录（.gitkeep）
├── nginx/
│   └── lifeos.conf               # Nginx 反代配置（备案前后双模式）
├── proxy.ts                      # Middleware——认证守卫（matcher 排除 _next/static|_next/image|favicon.ico）
├── proxy.test.ts                 # 中间件认证测试（10 测试）
├── deploy.sh                     # 主生产 Docker 一键部署脚本
├── Dockerfile                    # node:20-slim + npm ci
├── docker-compose.yml            # next + nginx + volume
├── components.json               # shadcn/ui 配置（style: base-nova, rsc: true, baseColor: neutral）
├── vitest.config.ts              # vitest（jsdom + @/ alias）
├── vitest.setup.ts               # 测试初始化（@testing-library/jest-dom/vitest）
├── playwright.config.ts          # Playwright E2E 配置
├── next-env.d.ts                 # Next.js 自动生成，无需手动维护
├── .env.example                  # 开发参考模板（含 Turso 字段）
├── .env.prod.example             # 自托管 Docker 模板（无 Turso 字段）
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── vercel.json
├── AGENTS.md                     # ← 你在这里
├── DEPLOY.md
└── README.md
```

## API 端点参考

### /api/auth

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| POST | `/api/auth` | `{ password: string }` | 200 `{ ok: true }` + cookie / 401 `{ ok: false }` | 密码登录，设置 `app_auth` cookie（30天, httpOnly, SameSite=lax） |

### /api/notes

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/notes` | `q?`, `tag?`, `limit?`(1-500, 默认200), `offset?`, `startDate?`, `endDate?`, `summary?` | 200 `{ notes: Note[] }` | 列表/搜索/分页 |
| POST | `/api/notes` | `{ title?, content?, tags?, dueDate? }` | 201 `{ note: Note }` | 创建笔记 |
| DELETE | `/api/notes?id=<id>` | — | 200 `{ success: true }` | 删除单条 |
| PATCH | `/api/notes/[id]` | `{ title?, content?, tags?, dueDate?, done?, pinned? }` | 200 `{ note: Note }` | 更新笔记 |
| GET | `/api/notes/[id]` | — | 200 `{ note: Note }` / 404 `{ error }` | 单条详情 |
| DELETE | `/api/notes/[id]` | — | 200 `{ success: true }` | 删除单条 |

### /api/notes/batch

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| POST | `/api/notes/batch` | `{ ids: string[], action: "delete"|"addTag", tag? }` | 200 `{ success: true }` | 事务性批量操作 |

### /api/notes/[id]/attachments

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/notes/[id]/attachments` | — | 200 `{ attachments: Attachment[] }` | 附件列表 |
| POST | `/api/notes/[id]/attachments` | `file` (multipart/form-data) | 201 `{ attachment: Attachment }` | 上传附件（≤10MB, 禁止 svg） |
| DELETE | `/api/notes/[id]/attachments?url=<url>` | — | 200 `{ success: true }` | 删除附件 |

### /api/budgets

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/budgets` | — | 200 `{ budgets: Budget[] }` | 全部预算 |
| GET | `/api/budgets` | `month=YYYY-MM` | 200 `{ budget: Budget }` / 404 | 单月预算 |
| POST | `/api/budgets` | `{ month, fixedBudget, variableBudget, fixedActual?, variableActual?, notes?, isCompleted?, savingsCompleted? }` | 200 `{ budget: Budget }` | Upsert |

### /api/habits

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/habits` | — | 200 `{ habits: Habit[] }` | 全部习惯 |
| GET | `/api/habits` | `dashboard=true` | 200 `{ dashboard: HabitDashboardItem[] }` | 合并查询 + 打卡 + streaks + 统计 |
| POST | `/api/habits` | `{ name, description?, frequency?("daily"|"weekly") }` | 201 `{ habit: Habit }` | 创建习惯 |
| PATCH | `/api/habits/[id]` | `{ name?, description?, frequency? }` | 200 `{ habit: Habit }` | 更新习惯 |
| DELETE | `/api/habits/[id]` | — | 200 `{ success: true }` | 删除（级联 habit_completions） |
| POST | `/api/habits/[id]/toggle` | `date=YYYY-MM-DD` | 200 `{ completion }` | 打卡切换（UNIQUE 防重复） |
| GET | `/api/habits/streaks` | — | 200 `{ streaks: { [habitId]: { current, best } } }` | 连续天数 |
| GET | `/api/habits/trends` | `startDate`, `endDate` | 200 `{ trends: { [habitId]: { completionRate, totalDays, completedDays } } }` | 趋势统计 |

### /api/tags

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/tags` | — | 200 `{ tags: { id, name, count }[] }` | 列表（含计数） |
| PUT | `/api/tags` | `{ oldName, newName }` | 200 `{ tag: { id, name } }` | 重命名/合并 |
| DELETE | `/api/tags` | `name=` | 200 `{ success: true }` | 删除（级联 note_tags） |

### /api/backup & /api/export

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/backup` | — | 200 `{ ...backupData }` | 导出全部数据 JSON |
| POST | `/api/backup` | `{ ...backupData }` | 200 `{ success: true }` / 400 `{ error }` | 恢复 JSON（validateBackup 校验） |
| GET | `/api/export` | — | 200 `text/markdown` | 导出全部笔记为 Markdown 文件 |

### 类型定义（`lib/types.ts`）

```typescript
interface Note {
  id: string; content: string; title: string | null; type: 'note'
  tags: string[]; dueDate: string | null; done: boolean; pinned: boolean
  createdAt: string; updatedAt: string
}
interface Budget {
  id: string; month: string; fixedBudget: number; variableBudget: number
  fixedActual: number | null; variableActual: number | null; notes: string
  isCompleted: boolean; savingsCompleted: boolean; createdAt: string; updatedAt: string
}
interface Habit {
  id: string; name: string; description: string; frequency: 'daily' | 'weekly'; createdAt: string
}
interface Attachment {
  id: string; noteId: string; filename: string; url: string; mimeType: string; fileSize: number; createdAt: string
}
```

### 认证

- **Header**: `app_auth` cookie 或 `Authorization: Bearer <token>`
- **未认证**: API 返回 401 `{ error: "Unauthorized" }`，页面 307 → `/login?from=<path>`
- **跳过**: `APP_PASSWORD` 空值时认证完全跳过
- **公开路径**: `/login`, `/api/auth`, `/manifest.json`, `/icons/`, `/uploads/`
- **底层**: `lib/auth-token.ts` 用 `crypto.subtle.sign('HMAC', key, password)` 派生，`verifyToken()` 常量时间比较

## 数据库 Schema

7 表，DDL 见 `migrations/001_create_tables.sql`。`getClient()` (`lib/db/client.ts:20`) 自动管理连接和 `PRAGMA foreign_keys = ON`。

| 表 | 列 | 主键 | 外键 | 索引 |
|----|----|------|------|------|
| **notes** | id TEXT PK, content TEXT NOT NULL, title TEXT, type TEXT DEFAULT 'note', due_date TEXT, done INTEGER DEFAULT 0, pinned INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL | id | — | `idx_notes_type`, `idx_notes_created`, `idx_notes_due_date`, `idx_notes_search(content,title)`, `idx_notes_pinned_created`, `idx_notes_type_due`, `idx_notes_done` |
| **budgets** | id TEXT PK, month TEXT NOT NULL UNIQUE, fixed_budget REAL DEFAULT 0, variable_budget REAL DEFAULT 0, fixed_actual REAL, variable_actual REAL, notes TEXT DEFAULT '', is_completed INTEGER DEFAULT 0, savings_completed INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL | id | — | — |
| **attachments** | id TEXT PK, note_id TEXT NOT NULL, filename TEXT NOT NULL, url TEXT NOT NULL, mime_type TEXT DEFAULT '', file_size INTEGER DEFAULT 0, created_at TEXT NOT NULL | id | note_id → notes(id) ON DELETE CASCADE | `idx_attachments_note(note_id)` |
| **habits** | id TEXT PK, name TEXT NOT NULL, description TEXT DEFAULT '', frequency TEXT DEFAULT 'daily', created_at TEXT NOT NULL | id | — | — |
| **habit_completions** | id TEXT PK, habit_id TEXT NOT NULL, date TEXT NOT NULL, completed INTEGER DEFAULT 0, created_at TEXT NOT NULL | id | habit_id → habits(id) ON DELETE CASCADE | `idx_habit_completions_habit(habit_id)`, `idx_habit_completions_unique(habit_id,date)` UNIQUE |
| **tags** | id TEXT PK, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL | id | — | — |
| **note_tags** | note_id TEXT, tag_id TEXT | (note_id, tag_id) 复合 PK | note_id → notes(id) ON DELETE CASCADE, tag_id → tags(id) ON DELETE CASCADE | `idx_note_tags_tag(tag_id)` |

迁移机制：`migrations/*.sql` → `_migrations` 追踪表 → `lib/db/migrate.ts` 执行器。命令：`npm run migrate` / `npm run migrate:dry` / `npm run migrate -- --reset`。

## 环境变量

单点源：所有文档交叉引用此表。

| 变量 | 必需？ | 用途 | 开发 (`.env.local`) | 主生产 Docker (`.env`) | 备用 Vercel |
|------|--------|------|---------|---------|---------|
| `DATABASE_URL` | 开发/主生产必需 | 本地 SQLite 路径 | `file:./data/dev.db` | `file:./data/db/lifeos.db` | — |
| `TURSO_DATABASE_URL` | 备用必需 | Turso 远程库地址 | **不得设置**（dev 护栏） | **显式清空** | `libsql://...` |
| `TURSO_AUTH_TOKEN` | 备用必需 | Turso 认证 Token | **不得设置** | **显式清空** | Turso token |
| `APP_PASSWORD` | 否 | 登录密码 | 不设 或 `demo` | 自定义 | 自定义 |
| `BLOB_READ_WRITE_TOKEN` | 否（附件） | Vercel Blob 存储 | — | — | Vercel token |
| `STORAGE_DRIVER` | 否 | 存储后端 | `vercel`（默认） | `local` | `vercel`（默认） |
| `COOKIE_SECURE` | 否 | cookie Secure 标志 | 不设 | `false`（HTTP 阶段） | `true` |
| `UPLOAD_DIR` | 否（local 驱动） | 本地上传目录 | — | `/app/data/uploads` | — |
| `UPLOAD_URL_PREFIX` | 否（local 驱动） | 本地附件 URL 前缀 | — | `/uploads` | — |

数据库选择逻辑：`url = TURSO_DATABASE_URL \|\| DATABASE_URL`（`lib/db/client.ts:25`）。dev 护栏：非生产 + `TURSO_DATABASE_URL` 匹配 `/turso\.(io\|tech)/i` → 抛错。E2E 隔离：`playwright.config.ts` 显式清空 `TURSO_*`。

## 关键约定

### UI 组件体系

组件库：`components/ui/` 封装 `@base-ui/react`（Button/Card/Input/Textarea/Badge/Checkbox/AlertDialog/ScrollArea/Sheet）。shadcn 配置 `components.json`：style `base-nova`, rsc `true`, baseColor `neutral`。

### 性能优化

- 列表项：`React.memo` + `displayName`（NoteCard, BudgetCard, HabitRow, ProgressBar）
- 回调：`useCallback`
- 懒加载：`next/dynamic`（TagManagerSheet, BatchActionsBar, AttachmentSection, MarkdownEditor）
- Zustand 缓存上限：`MAX_CACHED_NOTES = 500`
- 功能性函数 → 模块级函数；有状态 → 独立函数组件

### 状态管理

`useAppStore` (`store/index.ts`) 仅缓存笔记列表，5 个 action：`setNotes`/`addNote`/`removeNote`/`updateNote`/`setInitialLoading`。预算/习惯直取 API。

### UI 动效

`PageAnimation` 组件包裹 `animate-fade-in` class。CSS 动画定义于 `app/globals.css:199-216`：`fadeIn` keyframe（淡入 + 上移 8px, 0.35s ease-out），`pulse-soft` keyframe（透明度脉动）。加载态无独立骨架屏，内联 `skeleton-pulse` class div。

### PWA

| 项 | 说明 |
|----|------|
| SW | `public/sw.js`——install 预缓存 + activate 清理旧缓存 + `/_next/static/` cache-first |
| 离线 | 无离线 RSC/API 缓存，无离线 fallback |
| 安装引导 | 已移除，依赖浏览器原生提示 |
| manifest | `standalone`, `portrait`, 192x192 + 512x512 PNG（含 maskable） |
| theme-color | `#0f172a`（固定） |

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `note-detail-client.tsx` |
| React 组件 | PascalCase | `NoteCard` |
| 函数/变量 | camelCase | `getClient` |
| 类型/接口 | PascalCase | `Note` |

### 数据库约定

无内联 DDL，全部 `migrations/*.sql`。`getClient()` 单例，不在测试间共享。本地 SQLite 用 `PRAGMA foreign_keys = ON`。

## 测试策略

| 层 | 工具 | 文件数 | 测试数 | 数据库 |
|----|------|--------|--------|--------|
| 单元测试 | vitest (jsdom) | 13 | 117 | `file:./.db-test.sqlite`（临时文件，非 `:memory:`） |
| E2E | Playwright | 4 套件 | 13 | `file:./.e2e-test.db`（自动清理） |

### 单元测试清单

| 文件 | 测试数 | 覆盖范围 |
|------|--------|----------|
| `lib/__tests__/db.test.ts` | 22 | 笔记(7) + 习惯(4) + 预算(3) + 搜索与标签(8) |
| `lib/__tests__/markdown.test.tsx` | 5 | Markdown XSS 净化 |
| `lib/__tests__/utils.test.ts` | 5 | cn() + genId() + formatFileSize() |
| `lib/__tests__/streaks.test.ts` | 13 | computeCurrentStreak + computeBestStreak |
| `app/api/__tests__/routes.test.ts` | 15 | 所有 API 路由 + 认证守卫 401 |
| `components/__tests__/note-list.test.tsx` | 4 | 笔记列表渲染 |
| `components/__tests__/budget-habit.test.tsx` | 8 | ProgressBar(3) + BudgetCard(3) + HabitRow(2) |
| `components/__tests__/markdown-editor.test.tsx` | 7 | 三模式切换、自动保存、工具栏 |
| `components/__tests__/attachment-section.test.tsx` | 5 | 拖拽上传、缩略图、乐观删除 |
| `components/__tests__/batch-actions-bar.test.tsx` | 5 | 批量删除/加标签确认流程 |
| `components/__tests__/tag-manager-sheet.test.tsx` | 7 | 标签列表、内联重命名、点击筛选 |
| `store/__tests__/index.test.ts` | 11 | Zustand CRUD + MAX=500 |
| `proxy.test.ts` | 10 | 中间件认证（cookie/Bearer/公开路径/静态资源） |

### E2E 套件

`e2e/smoke.spec.ts`（登录重定向 + PWA manifest）、`e2e/notes.spec.ts`（笔记 CRUD + 搜索 + 标签 + 置顶）、`e2e/budgets.spec.ts`（预算设置 + 结算）、`e2e/habits.spec.ts`（习惯创建/打卡/删除）。

认证绕过：E2E 以 `APP_PASSWORD=''` 启动 dev server，中间件自动放行。

### 运行命令

```bash
npm test                 # 全部单元测试（vitest run）
npm run test:watch       # watch 模式
npm run test:e2e         # Playwright E2E（自动启动 dev server + 自动清理 .e2e-test.db）
```

## 运行命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 自动建表 + 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 生产启动 |
| `npm run lint` | ESLint |
| `npm test` | vitest 单元测试（13 文件, 117 测试） |
| `npm run test:watch` | 测试 watch 模式 |
| `npm run test:e2e` | Playwright E2E（4 套件, 13 测试） |
| `npm run migrate` | 执行待处理数据库迁移 |
| `npm run migrate:dry` | 仅列出待执行迁移 |
| `npm run migrate -- --reset` | 清空所有表后重新迁移 |
| `npm run analyze` | 构建产物体积分析（`@next/bundle-analyzer`） |

## 架构决策记录

### ADR-001: 双生产环境设计（已实施 2025）

- **决策**: 主生产 = 阿里云 ECS Docker（本地 SQLite + 本地磁盘）；备用 = Vercel hkg1 + Turso + Blob
- **理由**: 解耦 Vercel，摆脱平台锁定；主生产 PWA 不受冷启动影响
- **代价**: 手动备份恢复切换；两套环境变量配置
- **关联**: `.env.prod.example`, `docker-compose.yml`, `lib/db/client.ts`

### ADR-002: 存储驱动抽象层（已实施）

- **决策**: `lib/storage.ts` 定义 `StorageDriver` 接口（`save`/`remove`）；`VercelBlobDriver` + `LocalDiskDriver` 两实现；`getStorageDriver()` 按 `STORAGE_DRIVER` 选择
- **理由**: 同一份代码跑在两环境，不修改调用方
- **代价**: 本地驱动需 Nginx 配合提供 `/uploads/` 静态文件服务

### ADR-003: 无状态 HMAC 认证（已实施）

- **决策**: `crypto.subtle.sign('HMAC', key, password)` 派生 token，`verifyToken()` 常量时间比较；token 存 cookie `app_auth`（30天, httpOnly, SameSite=lax）或 `Authorization: Bearer`；密码空值认证跳过
- **理由**: Zero DB 依赖，Edge + Node 双运行时兼容；改密码即令旧 token 失效
- **代价**: 无法直接升级多用户（无此需求）
- **关联**: `lib/auth-token.ts`, `proxy.ts`, `app/api/auth/route.ts`

## 添加新模块流程

| 步骤 | 操作 | 文件 |
|------|------|------|
| 1 | 扩展类型定义 | `lib/types.ts` |
| 2 | 添加数据库操作函数，`index.ts` 重导出 | `lib/db/<module>.ts`, `lib/db/index.ts` |
| 3 | 创建页面（RSC + 客户端交互组件） | `app/<route>/page.tsx` |
| 4 | 添加导航项 | `lib/navigation.ts`（`NAV_ITEMS` 数组） |
| 5 | 构建验证 | `npm run build` |

## 24 项已修复问题

| # | 问题 | 修复 |
|---|------|------|
| 1 | README 测试数 146（错误 → 实际 117） | 修正为 13 文件/117 测试 |
| 2 | `@tanstack/react-virtual` 误列技术栈 | 已移除 |
| 3 | 目录树遗漏 `lib/auth-token.ts`, `proxy.test.ts` 等 | 已补充 |
| 4 | `globals.css` 缩进错误 | 已修正 |
| 5 | DEPLOY.md 章节号重复 | 已修正 |
| 6-7 | 遗漏 `class-variance-authority`, `tw-animate-css` | 已补充 |
| 8 | env-vars 多源不一致 | 合并为单点源 |
| 9 | 遗漏 `public/uploads/` | 已加入目录树 |
| 10 | CSS 动画描述模糊 | 改为精确 keyframe 描述 |
| 11 | 技术栈分组混乱 | 按层分组 |
| 12 | `npm run analyze` 位置错误 | 移到脚本表 |
| 13 | proxy matcher 描述不精确 | 补充精确表达式 |
| 14 | API 缺响应格式 | 全端点补充 |
| 15 | 术语不一致 | 规范化 |
| 16-24 | 引用、目录名、nginx 排错等 | 已全部修复 |
