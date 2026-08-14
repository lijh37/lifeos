# LifeOS — AI 简报（技术真相）

> 面向 AI 与协作者的压缩技术真相。**人**看使用/部署/自测请读 README.md。
> 生成区块（目录树 / 测试清单 / 命令表）由 `npm run docs:gen` 自动维护，**禁止手工编辑**。
> 本文散文设 12KB 尺寸红线（docs:check 断言，生成区块不计入）；新增内容必须压缩替换旧内容或由脚本派生。

## 1. 项目定位

单用户、自托管优先、无外部服务依赖的个人生活助手（笔记 / 预算 / 习惯 / 体重）。
四形态：**Android APK**（Capacitor + 原生 SQLite，完全离线）、**桌面 web**（`npm run start`）、**Docker**（阿里云 ECS，volume SQLite）、**Vercel + Turso**（远程库，与 Docker 数据独立）。各端经设置页 JSON 备份互通，同一时间只允许一端写库。

## 2. 任务路由表（动手前先读）

| 任务 | 必读 |
|---|---|
| 改 API 路由/参数/错误语义 | §4.2 契约表 + `app/api/*/route.ts`；改动后同步本文（docs-check 断言方法集合） |
| 改 Schema / 迁移 | `lib/db/migrations.ts`（唯一真相）+ §4.3；**加列必须走 `COLUMN_MIGRATIONS`** |
| 增删/改名环境变量 | §4.4 + `.env.example` / `.env.prod.example` |
| 移动端 / export 构建 | §7 构建约束（一行一条，细节经 git log 追溯） |
| 做架构决策 | §6——AI 起草（决策/动机/代价），**人批准状态** |
| 改 UI | §5 UI 约定 + `components/`、`app/` 对应文件 |
| 发版 / 真机自测 | README.md 附录「发版自测清单」 |

## 3. 人机协作与 AI 行为铁律

- **文档维护纪律**：任何变更涉及本文记录的事实（API/环境变量/Schema/命令/测试数）→ 完成时同步本文；精确计数以 `npm test` 等实际输出为准，散文不写死。
- **提交前验证**（Definition of Done）：改文件/测试后 `npm run docs:gen` → `git diff --exit-code -- AGENTS.md` 无输出 → `npm run docs:check` → `npm test`；涉及构建再跑 `npm run build`。CI 强制前三项。
- **单点真相**：Schema → `migrations.ts`；API 方法集合 → docs-check 契约清单；命令 → `package.json`；环境变量 → §4.4。
- **决策状态由人批准**：AI 起草 ADR（决策/动机/代价），人标 accepted / superseded，AI 不得自行批准。
- **README 使用/部署由人维护**，AI 只引用与校对，不擅自改写。
- 文档防漂移三层：生成（docgen）/ 断言（docs:check）/ 强制（CI）。

## 4. 架构与数据

### 4.1 架构与数据访问

Next.js 16 App Router 单体（SSR + API Routes 同仓）。客户端组件**只经 `lib/services/`**（`isNativeCapacitor()` 分流）：原生 → 动态 import `lib/db` 直查 SQLite；web → `fetch('/api/...')` 透传；校验函数为纯函数，路由复用。
数据库：`getClient()` 惰性双模（libsql 本地/远程 Turso ↔ capacitor 原生 SQLite），`PRAGMA foreign_keys = ON` 由适配器开启。
认证：无状态 HMAC（`lib/auth-token.ts`），`proxy.ts` 校验 cookie（`app_auth`，30 天 httpOnly lax）或 Bearer；`APP_PASSWORD` 空则跳过；公开 `/login`、`/api/auth`。

### 4.2 API 契约（路径/方法由 docs-check 断言，参数细节以 route.ts 为准）

| 路径 | 方法 | 要点 |
|---|---|---|
| `/api/auth` | POST | 登录设 cookie；密码留空跳过 |
| `/api/notes` | GET POST PATCH DELETE | 列表/搜索（q 最多 50）/日期范围分页/单条 `?id=`；POST type 仅 'note'；PATCH 不校验 type（读取归一） |
| `/api/notes/batch` | POST | 事务批量；action 不校验（未知值静默 success）；tag 覆盖语义 |
| `/api/budgets` | GET POST | 全部 / 单月 `month=`；upsert |
| `/api/habits` | GET POST PATCH DELETE | dashboard 单次返回全部统计；toggle 补记窗口 3 天 + 未来日期拒绝；宽容 streak（连漏 2 天才断） |
| `/api/tags` | GET PATCH DELETE | 列表含计数；重命名=合并；删除级联 |
| `/api/backup` | GET POST | 导出 / 恢复 JSON（validateBackup） |
| `/api/export` | GET | 笔记导出 Markdown |
| `/api/weight` | GET POST DELETE | person∈{me,her}；同日覆盖 |

### 4.3 Schema（列级唯一真相：`lib/db/migrations.ts`，终态幂等自愈、无版本簿记）

| 表 | 要点 |
|---|---|
| **notes** | content NOT NULL；`idx_notes_search(content,title)` 等 |
| **budgets** | `month` UNIQUE |
| **attachments** | 保留（阶段 3 无附件场景，迁移 SQL 零改动） |
| **habits** | frequency 'daily' / 'weekly' |
| **habit_completions** | `UNIQUE(habit_id,date)`；无 FK，级联手动 |
| **tags** | `name` UNIQUE |
| **note_tags** | (note_id,tag_id) 复合 PK；双 FK CASCADE |
| **weight_logs** | `UNIQUE(person,date)` |

### 4.4 环境变量（单点源）

| 变量 | 要点 |
|---|---|
| `DATABASE_URL` | 本地 SQLite（dev / Docker 必需） |
| `TURSO_DATABASE_URL` | 仅 Vercel 远程库；本地**禁止设置**（dev 护栏） |
| `TURSO_AUTH_TOKEN` | 仅 Vercel 认证 Token；本地**禁止设置** |
| `APP_PASSWORD` | 留空 = 免登录 |
| `COOKIE_SECURE` | HTTP 直连入口必须 false |
| `NEXT_PUBLIC_ICP_BEIAN` | 备案号页脚（公网域名） |
| `ANALYZE` | bundle-analyzer 构建开关 |
| `BUILD_TARGET` | export 静态导出开关（build:mobile 内部设置） |
| `BASE_URL` | Playwright E2E 目标地址 |

## 5. UI 约定

- 品牌主色 teal（`app/globals.css` 令牌，light/dark 双套）；深色模式跟随系统 + 设置页三态切换（localStorage `lifeos-theme`）。
- 页面头部统一 `components/page-header.tsx`（毛玻璃 sticky）；确认弹窗手机端为底部圆角抽屉；Toast 移动端贴底。
- 列表项 `React.memo` + displayName；重组件 `next/dynamic` 懒加载；Zustand 缓存上限 500；动效用 CSS keyframes（fadeIn/pop/slide-up），尊重 `prefers-reduced-motion`。
- 触摸目标 ≥44px；输入框移动端字号 ≥16px（防 iOS 聚焦缩放）。

## 6. 决策记录（AI 起草，人批准状态；日期/commit 经 git log 追溯）

| 编号 | 决策 | 动机 | 代价 | 状态 |
|---|---|---|---|---|
| AD-01 | 单用户、自托管优先、无外部依赖 | 数据主权；手机完全离线 | 无多用户/权限 | accepted |
| AD-02 | 双数据库适配器（libsql + capacitor） | `@libsql/client` 无法 WebView 持久化 | 双模测试面，需 Fake 高保真 | accepted |
| AD-03 | 无状态 HMAC 认证，无 session store | 零服务端状态，多端免同步 | 改密码旧 cookie 全失效，无集中登出 | accepted |
| AD-04 | 写库单端（JSON 备份互通） | WAL/文件锁风险，避免分布式复杂度 | 两端不能同时编辑 | accepted |
| AD-05 | 终态幂等迁移 + COLUMN_MIGRATIONS | 启动自愈收敛，正确性不依赖纪律 | 加列必须走注册表 | accepted |
| AD-06 | typescript 锁 ^5 | tsgo 与 Next build worker 不兼容 | 无法用 TS7 新特性 | accepted |
| AD-07 | Node 基线 20（Docker node:20-slim） | npm 在 22/24 有 Exit handler bug | 无法用 Node22+ 特性 | accepted |
| AD-08 | export 静态化约束（动态段合并/条件 GET/查询参数路由） | 移动端静态导出可用性（E301/动态段/Suspense） | 路由形态受限 | accepted |
| AD-09 | 附件/存储层剔除，attachments 表保留 | 无附件场景，减面减依赖 | 表结构残留 | accepted |
| AD-10 | 宽容式打卡（never miss twice + 3 天补记 + 诚实标记） | "忘打卡"≠"没完成"；单用户无作弊动机 | streak 数字变大；补记靠窗口+弱化标记 | accepted |
| AD-11 | GET 写数据源一律 no-store | 缓存三次与写后读一致性冲突 | 放弃 SWR 优化 | accepted |

## 7. 构建约束与已知坑（export 静态导出；一行一条，细节 git log 追溯）

- typescript 锁 `^5`（tsgo 与 Next 16 build worker 不兼容）。
- export 下动态段不可用 → 静态化合并：单笔记 `?id=`、详情页 `/notes/detail?id=`（useSearchParams 必须包 Suspense）。
- E301 规避：export 下 GET 条件置空（`BUILD_TARGET==='export' ? undefined : GETHandler` + 类型断言）。
- RSC prefetch 404（Next #85374 等）→ `<Link prefetch={false}>`。
- **静态导出内联脚本只进 RSC 载荷、无真实标签**（真机实测）→ `build:mobile` 后 `scripts/inject-theme-init.ts` 注入主题脚本（含定时重应用，因水合 #418 会重置 documentElement 类名）；SSR 由 layout 的 `next/script beforeInteractive` 负责；深色跟随前提是原生 DayNight 主题（android/values/styles.xml）。
- `@libsql/client` 不可在 WebView 持久化 → 移动端必须原生 sqlite。
- 写库单端（WAL/文件锁）；两端数据经 JSON 备份互通，不拷贝 .db。
- 原生连接跨上下文残留（真机）→ createConnection 失败时 closeConnection 重试；lazyFacade 初始化失败不缓存 rejected promise。
- Node 基线 20（npm 在 22/24 的 Exit handler bug）。

## 8. 路线图（backlog 状态化）

| 状态 | 事项 |
|---|---|
| done | 手机端 UI 美化 P0+P1+P2（teal 主色/深色模式/底部导航/各页排版/弹窗抽屉化/图表 tooltip/主题切换） |
| todo | P0 安全基线：`npm audit fix`（sharp）、生产默认口令、nginx `client_max_body_size` |
| todo | P1 回归防线：CI 增加 E2E、CI Node 统一 20、lint 零警告门禁、文档计数校准 |
| todo | P2 一致性还债：双端 Markdown 导出统一、备份导入业务校验、backup 双写收敛、weight created_at 保留 |
| todo | P3 打磨：覆盖率门禁、移动视口 E2E、compose healthcheck、登录限流 |

## 9. 测试策略

单测 vitest（jsdom）：文件与计数见下方生成区块，**精确数字以 `npm test` 输出为准**。
E2E Playwright 4 套件（smoke/notes/budgets/habits，含补记/置顶/结算）：`npm run test:e2e` 自动起 dev server、隔离库自动清理；认证绕过用 `APP_PASSWORD=''`。

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
│   ├── page-header.tsx
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
│   ├── inject-theme-init.ts
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

## 单元测试清单

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

## 运行命令

<!-- docgen:commands -->
> 本命令表由 npm run docs:gen 自动生成（package.json scripts 派生）；新增命令须在 package.json 登记。

| 命令                    | 说明                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run analyze`       | 构建产物体积分析（@next/bundle-analyzer）                          |
| `npm run build`         | 生产构建                                                           |
| `npm run build:apk`     | Gradle 构建 APK（先 cap:sync）                                     |
| `npm run build:mobile`  | 移动端静态导出 + 注入主题初始化脚本（输出 .next-export）           |
| `npm run cap:add`       | 添加 Capacitor Android 平台（首次构建执行一次）                    |
| `npm run cap:sync`      | build:mobile 后同步 web 产物到 Android 工程（APK 构建核心步骤）    |
| `npm run deploy:mobile` | 一键 APK 构建（build:mobile → cap sync → gradlew assembleDebug） |
| `npm run dev`           | 自动建表 + 启动开发服务器（--webpack）                             |
| `npm run docs:check`    | 文档契约断言（API/环境变量/Schema/命令/尺寸红线）                  |
| `npm run docs:gen`      | 重新生成 AGENTS.md 生成区块（目录树/测试清单/命令表）              |
| `npm run lint`          | ESLint                                                             |
| `npm run migrate`       | 幂等初始化数据库 schema（终态 DDL 重放）                           |
| `npm run start`         | 生产启动                                                           |
| `npm run test`          | vitest 单元测试                                                    |
| `npm run test:e2e`      | Playwright E2E（自动起 dev server，隔离库自动清理）                |
| `npm run test:watch`    | 测试 watch 模式                                                    |
<!-- /docgen:commands -->
