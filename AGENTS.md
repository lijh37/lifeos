# LifeOS — 技术参考

> 面向 AI Agent 的完整项目技术文档。AI 只需读此一份即可理解项目。

## 项目概述

LifeOS 是个人生活助手，支持笔记管理、预算规划、习惯养成。运行形态四态：**Android 手机**——Capacitor APK + 原生 SQLite 完全离线；**桌面 web**——`npm run start` 本地运行；**Docker**（阿里云 ECS）——volume SQLite；**Vercel + Turso**——Turso 远程库（与 Docker 数据独立）。测试在 jsdom 单测 + Playwright E2E 环境运行。

- **定位**: 单用户、自托管优先、无外部服务依赖
- **架构**: Next.js 16 App Router 单体（SSR + API Routes 同仓）
- **认证**: 无状态 HMAC（`crypto.subtle.sign`），无 session store
- **数据库**: `@libsql/client`（本地 SQLite / 远程 Turso）+ Capacitor 原生 `@capacitor-community/sqlite`（移动端）双适配器，`getClient()` 单例按运行环境惰性切换
- **存储**: 无附件场景，存储层（`lib/storage.ts`）已剔除（阶段 3）；备份走 JSON 导出/导入
- **部署**: 四种运行方式——手机 APK 完全离线、桌面 web 本地运行、Docker（阿里云 ECS）、Vercel + Turso（与 Docker 数据独立，见 README.md「运行形态」；部署步骤见 README.md 对应章节）

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
│   │   │   ├── batch/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── tags/
│   │   │   └── route.ts
│   │   └── weight/
│   │       └── route.ts
│   ├── expenses/
│   │   └── page.tsx
│   ├── habits/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── notes/
│   │   ├── detail/
│   │   │   ├── note-detail-client.tsx
│   │   │   ├── note-detail-page.tsx
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   ├── weight/
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── __tests__/
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
│   ├── route-loading-bar.tsx
│   ├── sidebar.tsx
│   ├── tag-manager-sheet.tsx
│   └── weight-chart.tsx
├── e2e/
│   ├── budgets.spec.ts
│   ├── habits.spec.ts
│   ├── helpers.ts
│   ├── notes.spec.ts
│   └── smoke.spec.ts
├── lib/
│   ├── __tests__/
│   │   ├── capacitor-adapter.test.ts
│   │   ├── columns.test.ts
│   │   ├── db.test.ts
│   │   ├── markdown.test.tsx
│   │   ├── streaks.test.ts
│   │   └── utils.test.ts
│   ├── db/
│   │   ├── adapters/
│   │   │   ├── capacitor.ts
│   │   │   ├── columns.ts
│   │   │   └── libsql.ts
│   │   ├── budgets.ts
│   │   ├── client.ts
│   │   ├── db-client.ts
│   │   ├── habits.ts
│   │   ├── index.ts
│   │   ├── migrate.ts
│   │   ├── migrations.ts
│   │   ├── native.ts
│   │   ├── notes.ts
│   │   ├── tags.ts
│   │   └── weight.ts
│   ├── services/
│   │   ├── __tests__/
│   │   │   ├── backup.test.ts
│   │   │   └── habits.test.ts
│   │   ├── auth.ts
│   │   ├── backup.ts
│   │   ├── budgets.ts
│   │   ├── env.ts
│   │   ├── file-share.ts
│   │   ├── habits.ts
│   │   ├── http.ts
│   │   ├── notes.ts
│   │   ├── tags.ts
│   │   └── weight.ts
│   ├── auth-token.ts
│   ├── markdown.tsx
│   ├── navigation.ts
│   ├── strip-markdown.ts
│   ├── types.ts
│   └── utils.ts
├── nginx/
│   └── lifeos.conf
├── scripts/
│   ├── deploy-mobile.sh
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
├── Dockerfile
├── README.md
├── capacitor.config.json
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

> 数据访问约定：客户端组件**不直接 fetch 本 API**，统一经 `lib/services/` 环境分流层调用（Capacitor 原生直查数据库，web 走本 API 透传，详见「数据访问层」）。路由保留用于 web 模式与测试基线；校验逻辑已抽至 `lib/services/*` 供路由与页面共用。

### /api/auth

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| POST | `/api/auth` | `{ password: string }` | 200 `{ ok: true }` + cookie / 401 `{ ok: false }` | 密码登录，设置 `app_auth` cookie（30天, httpOnly, SameSite=lax）；`APP_PASSWORD` 为空时不设 cookie |

### /api/notes

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/notes` | `id?`, `q?`, `tag?`, `type?`, `limit?`(1-500, 默认200), `offset?`, `startDate?`, `endDate?` | 200 `{ notes: Note[] }` / 带 `id` 时 200 `{ note: Note }` / 404 `{ error }` | 列表/搜索/分页。`offset` 仅 `startDate+endDate` 路径生效；搜索（`q`）固定返回最多 50 条；`tag` 仅与 `q` 组合时生效（单独 `tag` 无过滤效果）；`type` 参数已解析但当前无过滤效果。带 `id` 时返回单条，未找到 404（原动态段 `/api/notes/[id]` 已合并至此）。列表/搜索/日期范围响应头 `Cache-Control: private, no-store`（带 `id` 的单条查询不含该头） |
| POST | `/api/notes` | `{ title?, content?, type?, tags?, dueDate? }` | 200 `{ note: Note }` | 创建笔记（type 仅允许 'note'） |
| PATCH | `/api/notes` | `{ id, title?, content?, type?, tags?, dueDate?, done?, pinned? }` | 200 `{ note: Note }` | 更新笔记（PATCH 不校验 type：任意值原样入库，读取时统一归一为 'note'） |
| DELETE | `/api/notes?id=<id>` | — | 200 `{ success: true }` / 缺 `id` 400 `{ error: 'Missing id' }` | 删除单条 |

### /api/notes/batch

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| POST | `/api/notes/batch` | `{ ids: string[], action: "delete"\|"tag", tag? }` | 200 `{ success: true }` / `ids` 非数组或为空 400 `{ error: 'No ids provided' }` / 事务失败 500 | 事务性批量操作（注：当前代码不校验 action 值，未知值静默返回 {success:true}）。`action:"tag"` 为**覆盖语义**：每条笔记经 `syncNoteTags(noteId, [tag])` 先清空原有标签再写入该单个标签（UI 文案为「设置标签」，非追加） |

### /api/budgets

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/budgets` | — | 200 `{ budgets: Budget[] }` | 全部预算（`Cache-Control: private, no-store`） |
| GET | `/api/budgets` | `month=YYYY-MM` | 200 `{ budget: Budget | null }` | 单月预算（未设置时返回 null；与全部预算共用 `Cache-Control: private, no-store`） |
| POST | `/api/budgets` | `{ month, fixedBudget, variableBudget, fixedActual?, variableActual?, notes?, isCompleted?, savingsCompleted? }` | 200 `{ budget: Budget }` | Upsert（非法数值返回 400） |

### /api/habits

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/habits` | — | 200 `{ habits, todayCompletions, streaks, bestStreaks, perHabitRates, perHabitTotals, perHabitWeek, perHabitMonth, recentDays }` | 习惯列表 + 打卡 + streaks + 统计 + 最近3天补记视图（单次返回全部 dashboard 数据，无参数分支；streaks/bestStreaks 为宽容语义：段内允许 1 个漏记日不计数不中断，连续漏 2 天才断，锚点日（今天）未打卡不判漏；`recentDays` 为 `Record<habitId, {date, completed, isBackfilled}[]>`，每习惯最近 3 天（今天/昨天/前天）新在前，含无打卡习惯，`isBackfilled = localDateStr(created_at) > date`；`Cache-Control: private, no-store`） |
| POST | `/api/habits` | `{ name, description?, frequency?("daily"|"weekly") }` | 200 `{ habit: Habit }` | 创建习惯（frequency 非法值静默归一为 'daily'，不返回 400） |
| POST | `/api/habits` | `{ _action: "toggle", habitId, date }` | 200 `{ completed, streak, bestStreak, weekCount, monthCount, totalCompletions, isBackfilled, rate }` | 打卡切换（UNIQUE 防重复）；`date` 经 `validateToggleDate` 校验：非法格式或未来日期 → 400 `{ error: 'Cannot check in future dates' }`，早于前天（补记窗口 `BACKFILL_WINDOW_DAYS=3`，仅今天/昨天/前天可写）→ 400 `{ error: 'Can only backfill the last 3 days' }`；响应 `isBackfilled = completed && date !== 本地今天`，`rate` = 当月完成率（%，与 dashboard `perHabitRates` 同公式，供页面实时刷新） |
| PATCH | `/api/habits` | `{ id, name, description }` | 200 `{ success: true }` | 更新习惯（不支持 frequency 更新） |
| DELETE | `/api/habits?id=<id>` | — | 200 `{ success: true }` | 删除（代码手动级联删除 habit_completions） |

### /api/weight

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/weight` | — | 200 `{ me: WeightLog[], her: WeightLog[] }` | 按 person 分组、date 升序，空数组兜底；`Cache-Control: private, no-store` |
| POST | `/api/weight` | `{ person, date, weight, note? }` | 200 `{ weightLog: WeightLog }` | 校验：body JSON 解析失败 400 `{ error: 'invalid body' }`；person∈`WEIGHT_PERSONS` 键、date 匹配 `YYYY-MM-DD` 且真实日期、weight 有限且 >0 且 ≤500，否则 400；同人同日 upsert 覆盖 |
| DELETE | `/api/weight?id=<id>` | — | 200 `{ success: true }` | 删除单条，缺 id 返回 400 |

### /api/tags

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/tags` | — | 200 `{ tags: { name, count }[] }` | 列表（含计数；存在未加标签笔记时含 `__untagged__` 条目） |
| PATCH | `/api/tags` | `{ oldName, newName }` | 200 `{ success: true }` | 重命名/合并 |
| DELETE | `/api/tags` | `name=` | 200 `{ success: true }` | 删除（级联 note_tags） |

### /api/backup & /api/export

| 方法 | 路径 | 参数 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/api/backup` | — | 200 `{ ...backupData }` | 导出全部数据 JSON（响应带 `Content-Disposition: attachment`，强制下载） |
| POST | `/api/backup` | `{ ...backupData }` | 200 `{ success, imported }` / 400 `{ error }`（事务失败 500） | 恢复 JSON（validateBackup 校验） |
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
// 附件类型随阶段 3 已删除（无附件场景）；attachments 表保留（迁移 SQL 零改动）
type WeightPersonKey = 'me' | 'her'
interface WeightLog {
  id: string; person: WeightPersonKey; date: string; weight: number; note: string; createdAt: string
}
```

### 认证

- **Header**: `app_auth` cookie 或 `Authorization: Bearer <token>`
- **未认证**: API 返回 401 `{ error: "Unauthorized" }`，页面 307 → `/login?from=<path>`
- **跳过**: `APP_PASSWORD` 空值时认证完全跳过
- **公开路径**: `/login`, `/api/auth`（`proxy.ts` 用 **startsWith 前缀匹配**，`/login/*`、`/api/auth/*` 也公开）；路径含 `.` 的请求一律放行
- **执行位置**: 认证在根目录 `proxy.ts`（Next 16 Proxy/Middleware）实现，校验 cookie 与 Bearer 两种方式
- **底层**: `lib/auth-token.ts` 用 `crypto.subtle.sign('HMAC', key, password)` 派生，`verifyToken()` 长度检查 + 异或常量时间比较；`app/api/auth/route.ts` 密码比对用 `timingSafeEqual`，cookie 参数：maxAge 30 天、httpOnly、SameSite=lax、`path:'/'`，`secure` 由 `COOKIE_SECURE==='true'` 或生产环境且非 `'false'` 决定

## 数据库 Schema

8 表，DDL 见 `lib/db/migrations.ts`（内联 `SCHEMA_STATEMENTS`，唯一真相）。`getClient()`（`lib/db/client.ts:50`）惰性双模：Web/Node 走 `lib/db/adapters/libsql.ts`（`@libsql/client`，本地/远程 Turso），Capacitor 原生走 `lib/db/adapters/capacitor.ts`（`@capacitor-community/sqlite`，动态 import，不进 web bundle）；`PRAGMA foreign_keys = ON` 由各适配器开启（仅本地 SQLite）。

| 表 | 列 | 主键 | 外键 | 索引 |
|----|----|------|------|------|
| **notes** | id TEXT PK, content TEXT NOT NULL, title TEXT, type TEXT NOT NULL DEFAULT 'note', due_date TEXT, done INTEGER DEFAULT 0, pinned INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL | id | — | `idx_notes_type`, `idx_notes_created`, `idx_notes_due_date`, `idx_notes_search(content,title)`, `idx_notes_pinned_created`, `idx_notes_type_due`, `idx_notes_done(type, done)` |
| **budgets** | id TEXT PK, month TEXT NOT NULL UNIQUE, fixed_budget REAL NOT NULL DEFAULT 0, variable_budget REAL NOT NULL DEFAULT 0, fixed_actual REAL, variable_actual REAL, notes TEXT DEFAULT '', is_completed INTEGER DEFAULT 0, savings_completed INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL | id | — | — |
| **attachments** | id TEXT PK, note_id TEXT NOT NULL, filename TEXT NOT NULL, url TEXT NOT NULL, mime_type TEXT NOT NULL DEFAULT '', file_size INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL | id | note_id → notes(id) ON DELETE CASCADE | `idx_attachments_note(note_id)` |
| **habits** | id TEXT PK, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', frequency TEXT NOT NULL DEFAULT 'daily', created_at TEXT NOT NULL | id | — | — |
| **habit_completions** | id TEXT PK, habit_id TEXT NOT NULL, date TEXT NOT NULL, completed INTEGER DEFAULT 0, created_at TEXT NOT NULL | id | —（无 FK，级联由 lib/db/habits.ts deleteHabit 手动实现） | `idx_habit_completions_habit(habit_id)`, `idx_habit_completions_unique(habit_id,date)` UNIQUE |
| **tags** | id TEXT PK, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL | id | — | — |
| **note_tags** | note_id TEXT NOT NULL, tag_id TEXT NOT NULL | (note_id, tag_id) 复合 PK | note_id → notes(id) ON DELETE CASCADE, tag_id → tags(id) ON DELETE CASCADE | `idx_note_tags_tag(tag_id)` |
| **weight_logs** | id TEXT PK, person TEXT NOT NULL, date TEXT NOT NULL, weight REAL NOT NULL, note TEXT DEFAULT '', created_at TEXT NOT NULL | id | — | UNIQUE(person, date)（表级约束，无命名索引） |

迁移机制：终态幂等 DDL 内联于 `lib/db/migrations.ts`（`SCHEMA_STATEMENTS` 语句数组 + `COLUMN_MIGRATIONS` 列迁移注册表，唯一真相，web/移动端/CLI/测试均消费）→ `lib/db/migrate.ts` 的 `migrate(db: DbClient)` 执行器：`ensureSchema` 逐条重放终态 DDL（IF NOT EXISTS 幂等），`ensureColumn` 守卫式 ALTER（PRAGMA table_info 探测列，缺失才 ADD COLUMN）。**无版本簿记、无 `_migrations` 追踪表、无 checksum**——每次启动自愈收敛，正确性不依赖纪律。挂载点：`lib/db/client.ts` 惰性门面首次连接自动执行（任何环境，含 `npm run start`）+ Capacitor 首启显式调用。**加列一律追加 `COLUMN_MIGRATIONS`，禁止把新列塞进旧 CREATE TABLE**（既有库不重放建表语句）。命令：`npm run migrate` / `npm run migrate -- --reset`（仅 Node 环境 CLI）。

## 环境变量

单点源：所有文档交叉引用此表。

| 变量 | 必需？ | 用途 | 开发 (`.env.local`) | Docker (`.env`) | Vercel |
|------|--------|------|---------|---------|---------|
| `DATABASE_URL` | 开发/Docker 必需 | 本地 SQLite 路径 | `file:./data/lifeos.db` | `file:./data/db/lifeos.db` | — |
| `TURSO_DATABASE_URL` | Vercel 必需 | Turso 远程库地址 | **不得设置**（dev 护栏） | docker-compose.yml 置空 | `libsql://...` |
| `TURSO_AUTH_TOKEN` | Vercel 必需 | Turso 认证 Token | **不得设置** | docker-compose.yml 置空 | Turso token |
| `APP_PASSWORD` | 否 | 登录密码 | 不设 或 `demo` | 自定义 | 自定义 |
| `COOKIE_SECURE` | 否 | cookie Secure 标志（`http://IP:3000` 直连入口需为 false） | 不设 | `false`（默认，双入口 IP:3000 + HTTPS） | `true` |
| `NEXT_PUBLIC_ICP_BEIAN` | 否 | 备案号页脚文案（仅公网域名部署时设置；不设则不渲染页脚，APK/桌面本地无需） | 不设 | `豫ICP备2026036606号-1` | 不设 |
| `ANALYZE` | 否 | bundle-analyzer 构建开关 | 不设 | 不设 | 不设 |
| `BUILD_TARGET` | 否（移动端构建） | 移动端静态导出开关：`export` 时启用 `output: 'export'`（`npm run build:mobile` 内部设置） | 不设 | 不设 | 不设 |
| `BASE_URL` | 否（E2E） | Playwright 目标地址 | 不设 | 不设 | 不设 |

> 注：`NODE_ENV`/`CI`/`PORT`/`HOSTNAME`/`NEXT_TELEMETRY_DISABLED`/`NODE_OPTIONS` 等平台内置变量由运行时注入，不列入上表。

> 注：历史废弃变量 `STORAGE_DRIVER`/`UPLOAD_DIR`/`UPLOAD_URL_PREFIX`/`BLOB_READ_WRITE_TOKEN` 已随附件功能（阶段 3）彻底移除——代码、`.env` 模板、compose 均无引用，`@vercel/blob` 依赖已删除；旧部署残留不影响运行。

数据库选择逻辑：`url = TURSO_DATABASE_URL \|\| DATABASE_URL`（`lib/db/adapters/libsql.ts:24-26`）。dev 护栏：非生产 + `TURSO_DATABASE_URL` 匹配 `/turso\.(io\|tech)/i` → 抛错。E2E 隔离：`playwright.config.ts` 显式清空 `TURSO_*`。

## 关键约定

### UI 组件体系

组件库：`components/ui/` 封装 `@base-ui/react`（Button/Input/Badge/AlertDialog/ScrollArea/Sheet）；Card/Checkbox/Textarea 为纯 HTML 手写组件。shadcn 配置 `components.json`：style `base-nova`, rsc `true`, baseColor `neutral`。

### 性能优化

- 列表项：`React.memo` + `displayName`（NoteCard, BudgetCard, HabitRow, ProgressBar）
- 回调：`useCallback`
- 懒加载：`next/dynamic`（TagManagerSheet, BatchActionsBar, MarkdownEditor）
- Zustand 缓存上限：`MAX_CACHED_NOTES = 500`
- 功能性函数 → 模块级函数；有状态 → 独立函数组件

### 状态管理

`useAppStore` (`store/index.ts`) 仅缓存笔记列表，5 个 action：`setNotes`/`addNote`/`removeNote`/`updateNote`/`setInitialLoading`。预算/习惯/体重/备份均经 services 层获取（不在 store）。

### 数据访问层（`lib/services/`）

客户端组件的唯一数据入口，按运行环境分流（`lib/services/env.ts` 的 `isNativeCapacitor()` 检测 `window.Capacitor.isNativePlatform`）：

- **Capacitor 原生**（移动端）：`await import('@/lib/db')` 动态加载 lib/db 模块直查本地 SQLite——动态 import 保证 web bundle 不含 `@libsql/client`。
- **web/测试**（桌面 `npm run start`、jsdom 单测）：`fetch('/api/...')` 透传，URL/method/body/错误语义（非 ok 抛 `Error(body?.error \|\| 'HTTP '+status)`）与 API 逐字一致，组件测试 mock 全局 fetch 仍有效（jsdom 无 `window.Capacitor` → 走 web 分支）。

模块：`notes`（listNotes/getNote/createNote/updateNote/deleteNote/batchDeleteNotes/batchTagNotes/exportNotesMarkdown + validateNoteInput）、`tags`（listTags/renameTag/deleteTag）、`habits`（fetchHabitsDashboard/toggleHabit/createHabit/updateHabit/deleteHabit）、`budgets`（fetchBudget/fetchAllBudgets/saveBudget + validateBudgetInput）、`weight`（fetchWeightData/saveWeightLog/deleteWeightLog + validateWeightInput）、`backup`（exportBackupData/importBackupData + validateBackup）、`auth`（login，原生离线恒 `{ok:true}` 跳过登录）。校验函数为纯函数，API 路由复用（阶段 3 删路由时页面已无感）。附件功能已剔除（阶段 3）：`attachment-section` 组件、附件 API 路由、`lib/db/attachments.ts`、`lib/storage.ts` 均已删除，`attachments` 表保留（迁移 SQL 零改动）。

### UI 动效

`PageAnimation` 组件包裹 `animate-fade-in` class。CSS 动画定义于 `app/globals.css:199-216`：`fadeIn` keyframe（淡入 + 上移 8px, 0.35s ease-out），`pulse-soft` keyframe（透明度脉动）。笔记详情页骨架屏在 `app/notes/detail/page.tsx`（Suspense 兜底），其余页面加载态内联 `skeleton-pulse` class div。

### PWA 残留清理

旧 PWA 已移除（commit 91ab2f42 删 sw.js/manifest/icons），但浏览器已注册的 Service Worker 不会因 `/sw.js` 404 自动注销，会持续拉取并缓存旧静态资源。`app/layout.tsx` 内联脚本每次加载注销全部 Service Worker 并清空 caches 自愈——此脚本是 PWA 移除的配套清理，勿删。注意：SW 只注销不拦截导航（旧 sw.js 仅缓存 `/_next/static/`），新 HTML 始终可达，故内联脚本每次必然执行。

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `note-detail-client.tsx` |
| React 组件 | PascalCase | `NoteCard` |
| 函数/变量 | camelCase | `getClient` |
| 类型/接口 | PascalCase | `Note` |

### 数据库约定

迁移 SQL 内联于 `lib/db/migrations.ts`（唯一真相）。`getClient()` 单例（惰性门面），不在测试间共享；Capacitor 适配器测试用唯一临时库文件（libsql 同路径连接删库后进入只读坏态）。本地 SQLite 用 `PRAGMA foreign_keys = ON`。

### 离线/移动端构建约束（export 静态导出，spike/阶段 5 实测沉淀）

- **typescript 锁 `^5`**：tsgo（TS 7）与 Next 16 build worker 不兼容（报 `The "id" argument must be of type string. Received undefined`），勿升 7。
- **export 下动态段不可用**：动态段 API 路由即使导出 `generateStaticParams` + `dynamicParams:false` 仍报 missing（export 收集器不识别）→ 必须合并静态化：单笔记 API 已并入 `/api/notes`（GET `?id=` / PATCH / DELETE `?id=`）；页面动态路由改查询参数路由 `/notes/detail?id=` + `useSearchParams`（**必须包 Suspense**，Next 15+ 无关闭 flag；生产构建报 missing-suspense-with-csr-bailout，dev 不报）。
- **E301 规避**：`output:'export'` 下路由含 GET 处理器且无任何静态声明（force-static/error/revalidate/generateStaticParams）→ 构建抛错。已用条件 GET 置空规避：`export const GET = process.env.BUILD_TARGET === 'export' ? undefined : GETHandler`（配 `as typeof GETHandler` 断言还原类型）；仅 POST 的路由（auth、notes/batch）不触发。
- **RSC prefetch 404 风险**：`<Link>` prefetch 的 RSC payload `.txt` 路径与生成路径不匹配 → 404（Next issues #85374/#73427/#87682，16.0~16.2.x 均受影响）。spike（16.2.9 扁平结构）未复现，但真实路由树更复杂，真机 WebView 仍须终验；兜底 `<Link prefetch={false}>`。
- **@libsql/client 不可在 WebView 持久化**（纯内存，无 OPFS/IDB 支持）→ 移动端必须走原生 `@capacitor-community/sqlite`。
- **写库单端**：手机与桌面不同时写同一库（WAL/文件锁风险）；数据经设置页 JSON 导出/导入互通，不直接拷贝 .db。
- **原生连接跨上下文残留**（真机实测）：`isConnection()` 只查 JS 侧 `_connectionDict`，检测不到原生侧连接；整页重载（RSC 404 等触发新 JS 上下文）后新上下文 dict 为空 → `createConnection` 报 `Connection lifeos already exists` → 全接口连环挂。修复：`lib/db/adapters/capacitor.ts` 的 `openNativeConnection` 在 createConnection 抛 already-exists 时主动 `closeConnection()`（真正调原生、按库名关、跨上下文有效）后重试一次，isConnection 守卫仅作 JS 侧快路径。配套：`lib/db/client.ts` lazyFacade 初始化失败不缓存 rejected promise（`init.catch(() => { init = null })`），否则首次失败会永久毒化单例。

### 决策记录（为什么这样设计）

集中记录关键架构决策的动机，防止未来改动凭直觉推翻历史取舍。每条 = 决策 + 动机 + 代价。

| 决策 | 动机 | 代价 |
|------|------|------|
| 单用户、自托管优先、无外部服务依赖 | 数据主权；手机完全离线可用 | 无多用户/权限体系 |
| 双数据库适配器（libsql + Capacitor 原生） | `@libsql/client` 无法在 WebView 持久化；原生 SQLite 保离线 | 双模测试面，需 Fake 高保真 |
| 无状态 HMAC 认证，无 session store | 零服务端状态，多端免同步 | 改密码即旧 cookie 全失效，无集中登出 |
| 写库单端（JSON 备份互通） | WAL/文件锁风险，避免分布式一致性复杂度 | 两端不能同时编辑同一库 |
| 终态幂等迁移 + `COLUMN_MIGRATIONS`，无版本簿记 | 每次启动自愈收敛，正确性不依赖纪律 | 加列必须走注册表，禁止改旧 CREATE TABLE |
| typescript 锁 `^5` | tsgo（TS 7）与 Next 16 build worker 不兼容 | 无法使用 TS 7 新特性 |
| Node 基线 20（Docker `node:20-slim`，勿改回 22+） | npm 在 Node 22/24 有 `Exit handler never called!` bug（npm/cli#7639/#8974），构建/安装偶发失败 | 无法利用 Node 22+ 新特性 |
| export 静态化约束（动态段合并、条件 GET、查询参数路由） | 移动端静态导出可用性（E301、动态段缺失、Suspense 要求） | 路由形态受限，见「离线/移动端构建约束」 |
| 附件/存储层剔除（阶段 3），attachments 表保留 | 无附件场景，减面减依赖 | 迁移 SQL 零改动，表结构残留 |
| 宽容式打卡：never miss twice + 3 天补记窗口 + 诚实标记（isBackfilled 派生，零 Schema 变更） | "忘记打卡"≠"没完成"，惩罚式 streak 致前功尽弃感、弃用；单用户自托管无作弊动机，宽容追踪器更维持习惯（Atomic Habits）；`isBackfilled = localDateStr(created_at) > date` 直接派生，toggle 本就是 upsert | streak/bestStreak 数字变大（正向）；补记靠窗口（3 天）+ 视觉弱化标记保诚实；perHabitRates 补记自然累加 |
| GET 写数据源一律 no-store（预算/习惯/体重/笔记；tags 无头） | perf 引入的 HTTP 缓存（79b61be1）已三次与写后读一致性冲突（tags 移除头/notes 改 no-store/预算切月读旧值），单用户数据量小、缓存收益可忽略，一致性优先；服务端 no-store 从源头杜绝任何调用方踩缓存，客户端 fetch 显式 no-store 双保险 | 放弃 stale-while-revalidate 的 Turso 往返优化 |

## 测试策略

> 计数为近似值，随迭代变化；以 `npm test` / `npm run test:e2e` 实际输出为准。

| 层 | 工具 | 文件数 | 测试数 | 数据库 |
|----|------|--------|--------|--------|
| 单元测试 | vitest (jsdom) | 15 | 148 | `file:./.db-test.sqlite`（临时文件，非 `:memory:`） |
| E2E | Playwright | 4 套件 | 12 | `file:./.e2e-test.db`（自动清理） |

### 单元测试清单

<!-- docgen:tests -->
> 本清单由 npm run docs:gen 自动生成，计数为静态扫描近似值；精确数字以 npm test 实际输出为准。

| 文件                                              | 测试数（约） | 覆盖范围                                       |
| ------------------------------------------------- | ------------ | ---------------------------------------------- |
| `app/api/__tests__/routes.test.ts`                | 24           | API 路由                                       |
| `components/__tests__/batch-actions-bar.test.tsx` | 5            | BatchActionsBar                                |
| `components/__tests__/budget-habit.test.tsx`      | 12           | ProgressBar                                    |
| `components/__tests__/markdown-editor.test.tsx`   | 7            | MarkdownEditor                                 |
| `components/__tests__/note-list.test.tsx`         | 9            | NoteList                                       |
| `components/__tests__/tag-manager-sheet.test.tsx` | 7            | TagManagerSheet                                |
| `lib/__tests__/capacitor-adapter.test.ts`         | 9            | capacitor 适配器（libsql 后端 Fake 高保真）    |
| `lib/__tests__/columns.test.ts`                   | 11           | splitTopLevel + exprName + analyzeSelect       |
| `lib/__tests__/db.test.ts`                        | 31           | 笔记 + 习惯 + 预算 + 搜索与标签 + Weight       |
| `lib/__tests__/markdown.test.tsx`                 | 5            | MarkdownRenderer XSS 净化                      |
| `lib/__tests__/streaks.test.ts`                   | 17           | computeCurrentStreak (宽容式 never-miss-twice) |
| `lib/__tests__/utils.test.ts`                     | 5            | cn                                             |
| `lib/services/__tests__/backup.test.ts`           | 6            | backup cap 分支（Capacitor 原生直查 SQLite）   |
| `lib/services/__tests__/habits.test.ts`           | 6            | validateToggleDate (宽容式补记窗口校验)        |
| `proxy.test.ts`                                   | 10           | 中间件认证                                     |
| `store/__tests__/index.test.ts`                   | 11           | Zustand store                                  |
<!-- /docgen:tests -->

### E2E 套件

`e2e/smoke.spec.ts`（登录重定向 + 免认证访问）、`e2e/notes.spec.ts`（笔记 CRUD + 搜索 + 标签 + 置顶）、`e2e/budgets.spec.ts`（预算设置 + 结算）、`e2e/habits.spec.ts`（习惯创建/打卡/删除）。

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
| `npm run dev` | 自动建表 + 启动开发服务器（`--webpack` 强制 webpack 编译，非 Turbopack） |
| `npm run build` | 生产构建 |
| `npm run build:mobile` | 移动端静态导出（`BUILD_TARGET=export next build`，输出 `.next-export`） |
| `npm run cap:add` | 添加 Capacitor Android 平台（首次构建时执行一次） |
| `npm run cap:sync` | 先执行 `build:mobile` 再同步 web 产物到 Android 原生工程（APK 构建核心步骤） |
| `npm run build:apk` | 直接调用 Android Gradle 构建 APK（`cd android && ./gradlew assembleDebug`，需先 cap:sync） |
| `npm run deploy:mobile` | 一键 APK 构建（`scripts/deploy-mobile.sh`：build:mobile → cap sync → gradlew assembleDebug） |
| `npm run start` | 生产启动 |
| `npm run lint` | ESLint |
| `npm test` | vitest 单元测试（约 148 个，见 `__tests__/`） |
| `npm run test:watch` | 测试 watch 模式 |
| `npm run test:e2e` | Playwright E2E（4 套件, 12 测试；pretest 自动清理 .e2e-test.db，自动启动 dev server） |
| `npm run migrate` | 幂等初始化数据库 schema（终态 DDL 重放，可安全重复运行） |
| `npm run migrate -- --reset` | 清空所有表后重新初始化（开发用） |
| `npm run analyze` | 构建产物体积分析（`@next/bundle-analyzer`） |
| `npm run docs:check` | 校验 AGENTS.md 与代码/示例文件一致性（CI quality job 执行；断言组见 scripts/docs-check.ts，覆盖 API 路径、环境变量、README 版本、Schema 表名、命令表） |
| `npm run docs:gen` | 重新生成 AGENTS.md 目录树与测试清单区块（CI 先跑 docgen 再用 `git diff --exit-code` 校验无漂移） |

> 环境要求：Node >= 20（`package.json` engines）。

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

### Definition of Done（改动完成前必须同步的文档）

| 改动类型 | 必须同步 | 验证 |
|----------|----------|------|
| 改 API 路由/参数/响应/错误语义 | AGENTS.md API 端点参考；新增路径/方法时同步 `docs-check.ts` 契约清单 | `npm run docs:check` |
| 新增/改名环境变量 | AGENTS.md 环境变量表 + `.env.example` / `.env.prod.example` | `npm run docs:check` |
| 改 Schema（加表/加列） | AGENTS.md 数据库 Schema 表 + `COLUMN_MIGRATIONS` 注册 | `npm run docs:check` |
| 增删文件/增删测试 | 重跑 `npm run docs:gen`（自动重写目录树与测试清单区块） | `git diff --exit-code -- AGENTS.md` |
| 升级依赖 | 核对 README.md 中出现的三段版本号 | `npm run docs:check` |
| 引入新命令 | AGENTS.md 运行命令表 + `package.json` scripts | `npm run docs:check` |
| 部署方式/运维流程变化 | README.md 对应章节 | 人工核对 |

## 文档保鲜机制（防漂移）

文档不靠自觉保鲜，靠机器验证。三层机制，改任何文档/代码后必须全部通过：

| 层 | 机制 | 守护内容 |
|----|------|----------|
| 生成 | `npm run docs:gen`（scripts/docgen.ts） | 自动重写 AGENTS.md 的 `<!-- docgen:tree -->` 目录树与 `<!-- docgen:tests -->` 测试清单区块；**生成区块禁止手工编辑** |
| 断言 | `npm run docs:check`（scripts/docs-check.ts） | 7 组断言：API 路径与方法（不多不少）、废弃表述防回潮、环境变量双向一致（代码↔文档表↔.env 示例）、README 版本 ⊆ package.json、Schema 表名齐全、命令表 ⊆ scripts |
| 强制 | CI（.github/workflows/ci.yml quality job） | 先跑 docgen 再用 `git diff --exit-code` 校验无漂移，再跑 docs:check |

规则：

- AGENTS.md 环境变量表是单点源；README/.env 示例只做部署上下文引用，不复制全表
- 新增可验证声明时，优先扩展 docs-check 断言组，而不是写进文档靠自觉
- 新增废弃表述时，同步扩充 `docs-check.ts` 的 `DEPRECATED_PHRASES` 词库

## 添加新模块流程

| 步骤 | 操作 | 文件 |
|------|------|------|
| 1 | 扩展类型定义 | `lib/types.ts` |
| 2 | 添加数据库操作函数，`index.ts` 重导出 | `lib/db/<module>.ts`, `lib/db/index.ts` |
| 3 | 创建页面（RSC + 客户端交互组件） | `app/<route>/page.tsx` |
| 4 | 添加导航项 | `lib/navigation.ts`（`NAV_ITEMS` 数组） |
| 5 | 构建验证 | `npm run build` |

