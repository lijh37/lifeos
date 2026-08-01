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

<!-- docgen:tree -->
> 本目录树由 npm run docs:gen 自动生成，基于 git 跟踪文件；可能滞后于未提交的新文件。

```
lifeos/
├── .github/
│   └── workflows/
│       └── ci.yml
├── app/
│   ├── api/
│   │   ├── __tests__/
│   │   │   └── routes.test.ts
│   │   ├── auth/
│   │   │   └── route.ts
│   │   ├── backup/
│   │   │   └── route.ts
│   │   ├── budgets/
│   │   │   └── route.ts
│   │   ├── export/
│   │   │   └── route.ts
│   │   ├── habits/
│   │   │   └── route.ts
│   │   ├── notes/
│   │   │   ├── [id]/
│   │   │   │   ├── attachments/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── batch/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   └── tags/
│   │       └── route.ts
│   ├── expenses/
│   │   └── page.tsx
│   ├── habits/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── notes/
│   │   ├── [id]/
│   │   │   ├── loading.tsx
│   │   │   ├── note-detail-client.tsx
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── __tests__/
│   │   ├── attachment-section.test.tsx
│   │   ├── batch-actions-bar.test.tsx
│   │   ├── budget-habit.test.tsx
│   │   ├── markdown-editor.test.tsx
│   │   ├── note-list.test.tsx
│   │   └── tag-manager-sheet.test.tsx
│   ├── ui/
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── input.tsx
│   │   ├── scroll-area.tsx
│   │   ├── sheet.tsx
│   │   └── textarea.tsx
│   ├── attachment-section.tsx
│   ├── batch-actions-bar.tsx
│   ├── budget-card.tsx
│   ├── budget-form.tsx
│   ├── error-boundary.tsx
│   ├── format-note-date.ts
│   ├── habit-row.tsx
│   ├── markdown-editor.tsx
│   ├── note-card.tsx
│   ├── note-list.tsx
│   ├── page-animation.tsx
│   ├── progress-bar.tsx
│   ├── pwa-handler.tsx
│   ├── route-loading-bar.tsx
│   ├── sidebar.tsx
│   └── tag-manager-sheet.tsx
├── e2e/
│   ├── budgets.spec.ts
│   ├── habits.spec.ts
│   ├── helpers.ts
│   ├── notes.spec.ts
│   └── smoke.spec.ts
├── lib/
│   ├── __tests__/
│   │   ├── db.test.ts
│   │   ├── markdown.test.tsx
│   │   ├── streaks.test.ts
│   │   └── utils.test.ts
│   ├── db/
│   │   ├── attachments.ts
│   │   ├── budgets.ts
│   │   ├── client.ts
│   │   ├── habits.ts
│   │   ├── index.ts
│   │   ├── migrate.ts
│   │   ├── notes.ts
│   │   └── tags.ts
│   ├── auth-token.ts
│   ├── markdown.tsx
│   ├── navigation.ts
│   ├── storage.ts
│   ├── strip-markdown.ts
│   ├── types.ts
│   └── utils.ts
├── migrations/
│   └── 001_create_tables.sql
├── nginx/
│   └── lifeos.conf
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── manifest.json
│   └── sw.js
├── scripts/
│   ├── docgen.ts
│   ├── docs-check.ts
│   └── migrate.ts
├── store/
│   ├── __tests__/
│   │   └── index.test.ts
│   └── index.ts
├── .dockerignore
├── .env.example
├── .env.prod.example
├── .gitignore
├── AGENTS.md
├── DEPLOY.md
├── Dockerfile
├── README.md
├── components.json
├── deploy.sh
├── docker-compose.yml
├── eslint.config.mjs
├── next.config.ts
├── package-lock.json
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── proxy.test.ts
├── proxy.ts
├── tsconfig.json
├── vercel.json
├── vitest.config.ts
└── vitest.setup.ts
```
<!-- /docgen:tree -->

## API 端点参考

### /api/auth

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| POST | `/api/auth` | `{ password: string }` | 200 `{ ok: true }` + cookie / 401 `{ ok: false }` | 密码登录，设置 `app_auth` cookie（30天, httpOnly, SameSite=lax） |

### /api/notes

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/notes` | `q?`, `tag?`, `type?`, `limit?`(1-500, 默认200), `offset?`, `startDate?`, `endDate?` | 200 `{ notes: Note[] }` | 列表/搜索/分页。`offset` 仅 `startDate+endDate` 路径生效；搜索（`q`）固定返回最多 50 条 |
| POST | `/api/notes` | `{ title?, content?, type?, tags?, dueDate? }` | 201 `{ note: Note }` | 创建笔记（type 仅允许 'note'） |
| DELETE | `/api/notes?id=<id>` | — | 200 `{ success: true }` | 删除单条 |
| PATCH | `/api/notes/[id]` | `{ title?, content?, tags?, dueDate?, done?, pinned? }` | 200 `{ note: Note }` | 更新笔记 |
| GET | `/api/notes/[id]` | — | 200 `{ note: Note }` / 404 `{ error }` | 单条详情 |
| DELETE | `/api/notes/[id]` | — | 200 `{ success: true }` | 删除单条 |

### /api/notes/batch

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| POST | `/api/notes/batch` | `{ ids: string[], action: "delete"|"tag", tag? }` | 200 `{ success: true }` | 事务性批量操作 |

### /api/notes/[id]/attachments

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/notes/[id]/attachments` | — | 200 `{ attachments: Attachment[] }` | 附件列表 |
| POST | `/api/notes/[id]/attachments` | `file` (multipart/form-data) | 201 `{ attachment: Attachment }` | 上传附件（≤10MB） |
| DELETE | `/api/notes/[id]/attachments?attachmentId=<id>` | — | 200 `{ success: true }` | 删除附件（校验附件归属，不属该笔记返回 404） |

### /api/budgets

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/budgets` | — | 200 `{ budgets: Budget[] }` | 全部预算 |
| GET | `/api/budgets` | `month=YYYY-MM` | 200 `{ budget: Budget | null }` | 单月预算（未设置时返回 null） |
| POST | `/api/budgets` | `{ month, fixedBudget, variableBudget, fixedActual?, variableActual?, notes?, isCompleted?, savingsCompleted? }` | 200 `{ budget: Budget }` | Upsert |

### /api/habits

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/habits` | — | 200 `{ habits, todayCompletions, streaks, bestStreaks, perHabitRates, perHabitTotals, perHabitWeek, perHabitMonth }` | 习惯列表 + 打卡 + streaks + 统计（单次返回全部 dashboard 数据，无参数分支） |
| POST | `/api/habits` | `{ name, description?, frequency?("daily"|"weekly") }` | 200 `{ habit: Habit }` | 创建习惯 |
| POST | `/api/habits` | `{ _action: "toggle", habitId, date }` | 200 `{ completed, streak, bestStreak, weekCount, monthCount, totalCompletions }` | 打卡切换（UNIQUE 防重复） |
| PATCH | `/api/habits` | `{ id, name, description }` | 200 `{ success: true }` | 更新习惯（不支持 frequency 更新） |
| DELETE | `/api/habits?id=<id>` | — | 200 `{ success: true }` | 删除（代码手动级联删除 habit_completions） |

### /api/weight

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/weight` | — | 200 `{ me: WeightLog[], her: WeightLog[] }` | 按 person 分组、date 升序，空数组兜底；`Cache-Control: private, max-age=20, stale-while-revalidate=90` |
| POST | `/api/weight` | `{ person, date, weight, note? }` | 200 `{ weightLog: WeightLog }` | 校验：person∈`WEIGHT_PERSONS` 键、date 匹配 `YYYY-MM-DD` 且真实日期、weight 有限且 >0 且 ≤500，否则 400；同人同日 upsert 覆盖 |
| DELETE | `/api/weight?id=<id>` | — | 200 `{ success: true }` | 删除单条，缺 id 返回 400 |

### /api/tags

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/tags` | — | 200 `{ tags: { name, count }[] }` | 列表（含计数） |
| PATCH | `/api/tags` | `{ oldName, newName }` | 200 `{ success: true }` | 重命名/合并 |
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
type WeightPersonKey = 'me' | 'her'
interface WeightLog {
  id: string; person: WeightPersonKey; date: string; weight: number; note: string; createdAt: string
}
```

### 认证

- **Header**: `app_auth` cookie 或 `Authorization: Bearer <token>`
- **未认证**: API 返回 401 `{ error: "Unauthorized" }`，页面 307 → `/login?from=<path>`
- **跳过**: `APP_PASSWORD` 空值时认证完全跳过
- **公开路径**: `/login`, `/api/auth`, `/manifest.json`, `/icons/`, `/uploads/`
- **底层**: `lib/auth-token.ts` 用 `crypto.subtle.sign('HMAC', key, password)` 派生，`verifyToken()` 常量时间比较

## 数据库 Schema

8 表，DDL 见 `migrations/001_create_tables.sql` 与 `migrations/002_weight_logs.sql`。`getClient()` (`lib/db/client.ts:20`) 自动管理连接和 `PRAGMA foreign_keys = ON`。

| 表 | 列 | 主键 | 外键 | 索引 |
|----|----|------|------|------|
| **notes** | id TEXT PK, content TEXT NOT NULL, title TEXT, type TEXT DEFAULT 'note', due_date TEXT, done INTEGER DEFAULT 0, pinned INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL | id | — | `idx_notes_type`, `idx_notes_created`, `idx_notes_due_date`, `idx_notes_search(content,title)`, `idx_notes_pinned_created`, `idx_notes_type_due`, `idx_notes_done` |
| **budgets** | id TEXT PK, month TEXT NOT NULL UNIQUE, fixed_budget REAL DEFAULT 0, variable_budget REAL DEFAULT 0, fixed_actual REAL, variable_actual REAL, notes TEXT DEFAULT '', is_completed INTEGER DEFAULT 0, savings_completed INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL | id | — | — |
| **attachments** | id TEXT PK, note_id TEXT NOT NULL, filename TEXT NOT NULL, url TEXT NOT NULL, mime_type TEXT DEFAULT '', file_size INTEGER DEFAULT 0, created_at TEXT NOT NULL | id | note_id → notes(id) ON DELETE CASCADE | `idx_attachments_note(note_id)` |
| **habits** | id TEXT PK, name TEXT NOT NULL, description TEXT DEFAULT '', frequency TEXT DEFAULT 'daily', created_at TEXT NOT NULL | id | — | — |
| **habit_completions** | id TEXT PK, habit_id TEXT NOT NULL, date TEXT NOT NULL, completed INTEGER DEFAULT 0, created_at TEXT NOT NULL | id | —（无 FK，级联由 lib/db/habits.ts deleteHabit 手动实现） | `idx_habit_completions_habit(habit_id)`, `idx_habit_completions_unique(habit_id,date)` UNIQUE |
| **tags** | id TEXT PK, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL | id | — | — |
| **note_tags** | note_id TEXT, tag_id TEXT | (note_id, tag_id) 复合 PK | note_id → notes(id) ON DELETE CASCADE, tag_id → tags(id) ON DELETE CASCADE | `idx_note_tags_tag(tag_id)` |
| **weight_logs** | id TEXT PK, person TEXT NOT NULL, date TEXT NOT NULL, weight REAL NOT NULL, note TEXT DEFAULT '', created_at TEXT NOT NULL | id | — | `idx_weight_person_date(person,date)` UNIQUE |

迁移机制：`migrations/*.sql` → `_migrations` 追踪表 → `lib/db/migrate.ts` 执行器。命令：`npm run migrate` / `npm run migrate:dry` / `npm run migrate -- --reset`。

## 环境变量

单点源：所有文档交叉引用此表。

| 变量 | 必需？ | 用途 | 开发 (`.env.local`) | 主生产 Docker (`.env`) | 备用 Vercel |
|------|--------|------|---------|---------|---------|
| `DATABASE_URL` | 开发/主生产必需 | 本地 SQLite 路径 | `file:./data/dev.db` | `file:./data/db/lifeos.db` | — |
| `TURSO_DATABASE_URL` | 备用必需 | Turso 远程库地址 | **不得设置**（dev 护栏） | **显式清空** | `libsql://...` |
| `TURSO_AUTH_TOKEN` | 备用必需 | Turso 认证 Token | **不得设置** | **显式清空** | Turso token |
| `APP_PASSWORD` | 否 | 登录密码 | 不设 或 `demo` | 自定义 | 自定义 |
| `BLOB_READ_WRITE_TOKEN` | 否（附件） | Vercel Blob 存储（由 @vercel/blob 库隐式读取，代码无直接 process.env 引用） | — | — | Vercel token |
| `STORAGE_DRIVER` | 否 | 存储后端 | `vercel`（默认） | `local` | `vercel`（默认） |
| `COOKIE_SECURE` | 否 | cookie Secure 标志 | 不设 | `false`（HTTP 阶段） | `true` |
| `UPLOAD_DIR` | 否（local 驱动） | 本地上传目录 | — | `/app/data/uploads` | — |
| `UPLOAD_URL_PREFIX` | 否（local 驱动） | 本地附件 URL 前缀 | — | `/uploads` | — |
| `ANALYZE` | 否 | bundle-analyzer 构建开关 | 不设 | 不设 | 不设 |
| `BASE_URL` | 否（E2E） | Playwright 目标地址 | 不设 | 不设 | 不设 |

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

> 计数为近似值，随迭代变化；以 `npm test` / `npm run test:e2e` 实际输出为准。

| 层 | 工具 | 文件数 | 测试数 | 数据库 |
|----|------|--------|--------|--------|
| 单元测试 | vitest (jsdom) | ~13 | ~127 | `file:./.db-test.sqlite`（临时文件，非 `:memory:`） |
| E2E | Playwright | 4 套件 | ~13 | `file:./.e2e-test.db`（自动清理） |

### 单元测试清单

<!-- docgen:tests -->
> 本清单由 npm run docs:gen 自动生成，计数为静态扫描近似值；精确数字以 npm test 实际输出为准。

| 文件                                               | 测试数（约） | 覆盖范围                                                              |
| -------------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| `app/api/__tests__/routes.test.ts`                 | 20           | API 路由                                                              |
| `components/__tests__/attachment-section.test.tsx` | 5            | AttachmentSection                                                     |
| `components/__tests__/batch-actions-bar.test.tsx`  | 5            | BatchActionsBar                                                       |
| `components/__tests__/budget-habit.test.tsx`       | 8            | ProgressBar + BudgetCard + HabitRow                                   |
| `components/__tests__/markdown-editor.test.tsx`    | 7            | MarkdownEditor                                                        |
| `components/__tests__/note-list.test.tsx`          | 4            | NoteList                                                              |
| `components/__tests__/tag-manager-sheet.test.tsx`  | 7            | TagManagerSheet                                                       |
| `lib/__tests__/db.test.ts`                         | 28           | 笔记 + 习惯 + 预算 + 搜索与标签 + Weight + Migrations (legacy schema) |
| `lib/__tests__/markdown.test.tsx`                  | 5            | MarkdownRenderer XSS 净化                                             |
| `lib/__tests__/streaks.test.ts`                    | 13           | computeCurrentStreak + computeBestStreak                              |
| `lib/__tests__/utils.test.ts`                      | 5            | cn                                                                    |
| `proxy.test.ts`                                    | 10           | 中间件认证                                                            |
| `store/__tests__/index.test.ts`                    | 11           | Zustand store                                                         |
<!-- /docgen:tests -->

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
| `npm test` | vitest 单元测试（约 120 个，见 `__tests__/`） |
| `npm run test:watch` | 测试 watch 模式 |
| `npm run test:e2e` | Playwright E2E（4 套件, 13 测试） |
| `npm run migrate` | 执行待处理数据库迁移 |
| `npm run migrate:dry` | 仅列出待执行迁移 |
| `npm run migrate -- --reset` | 清空所有表后重新迁移 |
| `npm run analyze` | 构建产物体积分析（`@next/bundle-analyzer`） |

## AI 协作流程

### 角色与工具

本项目使用 OMO 自动分配子代理。常用代理类型：

| 代理 | 职责 | 何时触发 | 何时不触发（直接做） |
|------|------|---------|---------------------|
| explorer | 代码搜索、理解、调研 | 需先摸清现状、并行搜索 | 已知路径、即将编辑的文件 |
| librarian | 外部库文档、API 研究 | 第三方库用法/版本行为 | 标准用法、通用知识 |
| fixer | 代码实现、修改 | 多步实现、多文件并行 | 单文件 <20 行小改动 |
| designer | UI/UX 设计、样式 | 任何用户可见界面/交互/动效 | 纯后端、逻辑 |
| oracle | 架构决策、复杂调试、审查 | 高风险决策、两次未修复、大重构 | 首次修复尝试 |

> 委托边界：小改动直接做；多文件任务按目录拆多个 fixer 并行；同类任务复用会话省上下文。

> **文档维护纪律**：任何变更涉及 AGENTS.md 中记录的事实（目录结构/测试数/API 契约/环境变量），完成时必须同步更新 AGENTS.md——文档漂移由 AI 在任务完成时顺手消除，不依赖人工记忆。AGENTS.md 中的精确计数（如测试数）为近似值，以 `npm test` 等实际输出为准。

## 添加新模块流程

| 步骤 | 操作 | 文件 |
|------|------|------|
| 1 | 扩展类型定义 | `lib/types.ts` |
| 2 | 添加数据库操作函数，`index.ts` 重导出 | `lib/db/<module>.ts`, `lib/db/index.ts` |
| 3 | 创建页面（RSC + 客户端交互组件） | `app/<route>/page.tsx` |
| 4 | 添加导航项 | `lib/navigation.ts`（`NAV_ITEMS` 数组） |
| 5 | 构建验证 | `npm run build` |

