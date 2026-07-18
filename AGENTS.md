<!-- LifeOS - 生活助手 -->

# 项目概况

LifeOS 是一个个人生活助手应用。支持笔记管理、预算规划和习惯养成。

## 技术栈

- **框架**：Next.js 16 (App Router), TypeScript
- **UI 组件**：Tailwind CSS v4 + shadcn/ui (`base-nova` 风格，底层使用 `@base-ui/react` 而非 Radix)
- **数据库**：`@libsql/client`（libSQL；主生产用本地 SQLite 文件，备用生产用 Turso 云端）
- **状态管理**：Zustand v5（客户端状态，仅缓存笔记列表）
- **日期处理**：date-fns v4
- **图标**：lucide-react
- **文件存储**：`@vercel/blob`（附件上传）
- **虚拟列表**：`@tanstack/react-virtual`（长列表性能优化）
- **通知**：`sonner`（Toast 消息）
- **动画**：`tw-animate-css`（CSS 动画工具）
- **Markdown**：`react-markdown` + `rehype-sanitize` + `remark-gfm` + `remark-breaks`
- **工具函数**：`tailwind-merge` + `clsx`（`cn()` 合并 Tailwind 类）

## 目录结构

```
app/                  # Next.js App Router 页面和 API
  ├── favicon.ico     # 网站图标
  ├── globals.css     # Tailwind + CSS 变量 + 自定义动画（fadeIn/slideUp/stagger/card-hover/skeleton-pulse）
  ├── layout.tsx      # 根布局（ThemeProvider + Sidebar + MobileNav + PwaHandler + PageAnimation + RouteLoadingBar + Toaster）
  ├── page.tsx        # 首页（重定向到 /notes）
  ├── api/notes/      # 笔记 CRUD 接口
  │   ├── route.ts    # 列表（搜索+游标分页+标签筛选+摘要模式）
  │   ├── [id]/       # 单条笔记操作
  │   │   ├── route.ts
  │   │   └── attachments/   # 附件上传/列表/删除（Vercel Blob，10MB 限制，MIME 白名单）
  │   │       └── route.ts
  │   └── batch/      # 批量操作（事务性删除/加标签）
  │       └── route.ts
  ├── api/budgets/    # 预算 CRUD（upsert）
  ├── api/habits/     # 习惯 CRUD + 打卡 + streaks + 趋势 + 统计（getHabitsDashboard 合并查询）
  ├── api/backup/     # 备份导出/恢复 JSON（FK 安全顺序清空/导入）
  ├── api/tags/       # 标签列表/重命名/删除
  ├── api/export/     # 导出全部笔记为 Markdown 文件
  ├── api/auth/       # 密码验证（cookie 30 天）
  ├── notes/          # 笔记列表页（批量选择+搜索+置顶+无限滚动+标签筛选）
  │   ├── page.tsx    # 服务端组件 + Suspense + NotesPageSkeleton 骨架屏
  │   └── [id]/       # 笔记详情页
  │       ├── page.tsx    # 服务端组件
  │       ├── note-detail-client.tsx # 客户端交互（编辑器 + 标签 + 附件 + 删除）
  │       └── loading.tsx # 详情页加载骨架屏
  ├── expenses/       # 月度预算页（BudgetForm + BudgetCard 对比展示）
  ├── habits/         # 习惯页面（打卡+趋势+统计，内联编辑）
  ├── settings/       # 备份与恢复
  └── login/          # 登录页
components/             # React 组件
  ├── ui/               # `@base-ui/react` 基础组件（alert-dialog/badge/button/card/input/scroll-area/sheet/textarea/checkbox）
  ├── note-list.tsx     # 笔记列表（批量操作 + 搜索 + 置顶 + 按标签筛选 + 无限滚动，>50 项自动切虚拟列表，TagManagerSheet/BatchActionsBar 使用 next/dynamic）
  ├── note-card.tsx     # 单条笔记卡片（memo，标题/摘要/标签/日期/置顶/选择/悬停预取 + enablePrefetch 控制）
  ├── virtual-note-list.tsx # 虚拟滚动列表（memo，@tanstack/react-virtual，>50 项时启用）
  ├── batch-actions-bar.tsx # 批量操作栏（删除/加标签 AlertDialog 确认）
  ├── tag-manager-sheet.tsx # 标签管理 Sheet（列表/内联重命名/删除/点击筛选）
  ├── attachment-section.tsx # 附件区（拖拽上传/缩略图/文件类型图标/乐观删除）
  ├── markdown-editor.tsx # Markdown 编辑器（memo，分栏/编辑/预览三模式切换 + 6 工具栏 + 500ms 自动保存）
  ├── sidebar.tsx       # 导航（PC 侧栏 + 手机底部栏，4 项导航使用 lib/navigation）
  ├── budget-card.tsx   # 预算卡片（memo，月度汇总/超额提示/完成标记）
  ├── budget-form.tsx   # 预算表单（memo，固定+可变预算输入/实时合计/¥ 前缀）
  ├── progress-bar.tsx  # 进度条（memo，三色：绿/<85% 橙/85-100% 红/超额）
  ├── habit-row.tsx     # 习惯行（memo，打卡/内联编辑/删除/统计显示）
  ├── route-loading-bar.tsx # 全局路由加载进度条（基于 pathname/searchParams 变化触发，400ms 过渡）
  ├── format-note-date.ts # 日期格式化工具（中文相对时间："刚刚、X分钟前、昨天...")
  ├── error-boundary.tsx # React Error Boundary（含重试按钮）
  ├── theme-provider.tsx # 主题上下文（light/dark/system，localStorage 持久化）
  ├── theme-toggle.tsx  # 深色模式切换（Sun/Moon/Monitor 三态循环）
  ├── pwa-handler.tsx   # PWA 处理（memo，注册 Service Worker + 离线黄色横幅；安装引导已移除）
  ├── page-animation.tsx # 页面过渡动效（useSelectedLayoutSegment key 驱动 fadeIn）
  └── skeleton-card.tsx # 骨架屏（SkeletonNoteList / SkeletonHabits）
lib/                    # 核心逻辑
  ├── db/               # 数据库模块（通过 index.ts 重导出）
  │   ├── client.ts     # getClient() 单例连接管理（无 DDL，纯连接）
  │   ├── migrate.ts    # 迁移执行器（可编程 API，按版本执行 migrations/*.sql）
  │   ├── fts5.ts       # 运行时 FTS5 可用性探测（checkFts5，缓存结果）
  │   ├── notes.ts      # 笔记 CRUD + FTS5 搜索 + 游标/偏移分页 + 日期范围查询
  │   ├── habits.ts     # 习惯 CRUD + 打卡 + streaks + 最佳记录 + 周/月统计 + getHabitsDashboard() 合并查询
  │   ├── budgets.ts    # 预算 CRUD（upsert）
  │   ├── tags.ts       # 标签同步(syncNoteTags) + getAllTags(含计数) + renameTag(合并) + deleteTag
  │   ├── attachments.ts # 附件 CRUD（createAttachment / getAttachmentsByNoteId / deleteAttachment）
  │   └── index.ts      # 重导出（import from '@/lib/db'）
migrations/             # 数据库迁移（纯 SQL，按编号版本化）
  ├── 001_create_tables.sql
  └── 002_add_fulltext_search.sql
scripts/                # 工具脚本
  └── migrate.ts        # 迁移 CLI（npm run migrate）
  ├── types.ts          # TypeScript 类型（Note/Budget/Habit/Attachment）
  ├── markdown.tsx      # MarkdownRenderer（react-markdown + Tailwind 样式）
  ├── strip-markdown.ts # stripMarkdown 纯函数（抽离自 markdown.tsx，无 React 依赖）
  ├── navigation.ts     # 共享导航配置（NAV_ITEMS 4 项 / PRIMARY_MOBILE_NAV / MORE_MOBILE_NAV）
  └── utils.ts          # cn() + genId() + cn 内部使用 tailwind-merge + clsx
store/                  # Zustand 全局状态
  ├── index.ts          # useAppStore（笔记列表缓存，MAX_CACHED_NOTES=500，5 个 action）
  └── __tests__/        # 状态管理测试（11 测试）
lib/__tests__/          # 库测试
  ├── db.test.ts        # 数据库测试（27 测试：笔记7 + 习惯4 + 预算3 + 搜索与标签8 + 其他5）
  └── utils.test.ts     # 工具函数测试（5 测试）
components/__tests__/   # 组件测试
  ├── note-list.test.tsx         # 笔记列表组件测试（5 测试）
  ├── budget-habit.test.tsx      # 预算/习惯组件测试（19 测试：ProgressBar3 + BudgetCard3 + HabitRow13）
  ├── markdown-editor.test.tsx   # Markdown 编辑器测试（25 测试：基础3+自动保存4+工具栏8+视图5+移动端2+生命周期2+渲染1）
  ├── attachment-section.test.tsx # 附件组件测试（15 测试）
  ├── batch-actions-bar.test.tsx  # 批量操作栏测试（14 测试）
  └── tag-manager-sheet.test.tsx  # 标签管理 Sheet 测试（25 测试）
public/
  ├── manifest.json   # PWA 配置（standalone 模式，192+512 PNG 图标，portrait 锁定）
  └── icons/          # 应用图标（icon-192.png / icon-512.png）
```

## 关键约定

### 数据库

使用 `@libsql/client` 直接操作，7 个表（支持置顶 `pinned` 字段）+ 1 个 FTS5 虚拟表：
- `notes` — 笔记（含 FTS5 全文索引，3 个触发器同步）
- `budgets` — 月度预算（`month` 字段 UNIQUE）
- `habits` + `habit_completions` — 习惯打卡（含 UNIQUE 索引防重复）
- `attachments` — 笔记附件（外键 CASCADE 删除）
- `tags` + `note_tags` — 规范化标签关联（复合主键，双 FK CASCADE）
- 详情见 `lib/db/client.ts` 的 `getClient()` 和 `lib/db/migrate.ts`

#### 数据库迁移

DDL 不放在应用代码中。迁移通过 `migrations/*.sql` 文件管理：

- `npm run migrate` — 执行待处理迁移（连接由环境变量 `TURSO_DATABASE_URL` 或 `DATABASE_URL` 决定）
- `npm run migrate:dry` — 仅列出待执行迁移
- 测试中调用 `migrate(getClient())` 在 `beforeAll` 中显式建表
- 每次迁移在一个事务中完成，失败自动回滚
- `_migrations` 表追踪已执行的迁移及其校验和，防止篡改
- FTS5 可用性由运行时 `checkFts5()` 探测，迁移失败时优雅降级到 LIKE 搜索

### UI 动效约定

- 页面过渡：`PageAnimation` 组件基于 `useSelectedLayoutSegment` 实现 key 变化触发 fadeIn
- 列表交错：容器加 `animate-stagger`，子项自动延迟
- 骨架屏：使用 `SkeletonNoteList` / `SkeletonHabits` 替代手动 Loader2
- 卡片悬浮：列表中的 Card 统一加 `card-hover` 类
- 全局 CSS 动画定义于 `app/globals.css`（fadeIn / slideUp / slideInRight / stagger / skeleton-pulse / typing-dot）

### UI 组件库

- shadcn/ui `base-nova` 风格，底层使用 **`@base-ui/react`**（非传统 Radix UI）
- 已封装的组件位于 `components/ui/`：button / card / input / textarea / badge / checkbox / alert-dialog / scroll-area / sheet
- `components.json` 记录了 shadcn 配置（`"style": "base-nova"`, `"rsc": true`, `"baseColor": "neutral"`）

### 状态管理

- `useAppStore`（`store/index.ts`）：笔记列表缓存（限 500 条），5 个 action：`setNotes`/`addNote`/`removeNote`/`updateNote`/`setInitialLoading`
- 仅缓存笔记列表；预算和习惯数据由各页面直接通过 API 获取（不经过 Zustand）

### 性能优化约定

- 列表项组件统一加 `React.memo` + `displayName`（NoteCard, BudgetCard, HabitRow, ProgressBar, VirtualNoteList 等）
- 传递给子组件的回调函数统一用 `useCallback` 包装
- 笔记列表 >50 项时自动切换 `VirtualNoteList`（`@tanstack/react-virtual`，estimateSize=110px, overscan=10）
- 非首屏组件使用 `next/dynamic` 懒加载（TagManagerSheet/BatchActionsBar/AttachmentSection/MarkdownEditor）
- 笔记卡片悬停预取（prefetch）仅对前 20 项可见笔记生效（`enablePrefetch` 控制）
- 新组件提取后遵循：功能性函数（如 ProgressBar/formatNoteDate）→ 模块级函数；有状态的 → 独立函数组件

### PWA 约定

- `components/pwa-handler.tsx`：注册 Service Worker + 监听 `online`/`offline` 事件，离线时显示黄色 "当前离线" 横幅（memo 组件）
- **Service Worker 存在**：`public/sw.js` 提供离线缓存能力（install 预缓存静态资源 + activate 清理旧缓存并预热已知页面）。缓存策略：**静态资源（`/_next/static`、icons、manifest）cache-first（哈希不可变）**；**RSC 请求与 `/api/*` 一律 NetworkOnly（绝不缓存，避免部署后陈旧 RSC 导致白屏）**；页面导航 network-first + 离线 fallback 页。每次部署需 bump `sw.js` 中的 `CACHE` 常量以清掉旧缓存。
- **安装引导已移除**：当前未捕获 `beforeinstallprompt` 事件，无主动"安装到主屏"横幅（仅依赖浏览器原生安装提示，属有意设计）
- `public/manifest.json`：standalone 模式，portrait 锁定，192x192 + 512x512 PNG 图标（含 maskable）
- `theme-color`：深色模式运行时与 `manifest.json` 统一为 `#0f172a`，浅色模式为 `#ffffff`

## 部署

本项目有**两个生产环境**（主用 + 备用），数据各自独立、互不同步：

| 角色 | 环境 | 数据库 | 文件存储 | 入口 |
|------|------|--------|----------|------|
| **主生产** | 阿里云 ECS（Docker Compose，见 `DEPLOY.md`） | 本地 SQLite `file:./data/db/lifeos.db` | 本地磁盘（`STORAGE_DRIVER=local`） | nginx 反代 → `:3000`（备案前 HTTP） |
| **备用** | Vercel（`hkg1` 香港）+ Turso | Turso 远程 `lifeos-lijh37` | Vercel Blob | `https://opencode-demo.vercel.app` |

- **主生产**是日常使用的环境（PC 网页 + 手机 PWA，绑定阿里云域名）。详见 `DEPLOY.md`。
- **备用**保留以防阿里云不续费时切回；平时不写入，数据靠手动 `backup`/`restore` JSON 同步（见下「环境切换」）。
- **数据库迁移**：Docker 在容器启动命令里 `npm run migrate && npm run start` 自动建表；Vercel 部署前手动 `npm run migrate`（连 Turso 远程库）。
- **密码保护**：`proxy.ts`（Next.js 16 Middleware，matcher 匹配全部路由）+ `/login` 页 + `/api/auth` 接口
  - 认证方式：`app_auth` cookie（30 天）/ `Authorization: Bearer` 头
  - **cookie 内容**：`app_auth` 存的是由 `APP_PASSWORD` 派生的 HMAC token（`lib/auth-token.ts`），**不是明文密码**；中间件 `proxy.ts` 用 `verifyToken()` 校验，密码比对走常量时间比较。改密码后旧 token 自动失效。
  - 公开路径免认证：`/login`, `/api/auth`, `/manifest.json`, `/icons/`, `/uploads/`
  - 未认证 API 返回 401 JSON；未认证页面重定向到 `/login?from=<original_path>`
  - 若 `APP_PASSWORD` 未设置，则自动跳过认证

### 环境隔离设计

环境**不靠代码里的环境名区分**，只靠环境变量组合（`TURSO_DATABASE_URL` / `DATABASE_URL` / `STORAGE_DRIVER`）。决定性逻辑在 `lib/db/client.ts`：`url = TURSO_DATABASE_URL || DATABASE_URL`——只要 `TURSO_DATABASE_URL` 存在就忽略 `DATABASE_URL`。

| 环境 | 数据库 | 说明 |
|------|--------|------|
| **主生产（Docker）** | `DATABASE_URL=file:./data/db/lifeos.db` + `TURSO_DATABASE_URL=`（清空） | compose 显式清空 Turso 变量，强制走本地 SQLite |
| **备用（Vercel）** | `TURSO_DATABASE_URL` → Turso | 平台注入，不设 `STORAGE_DRIVER`（默认 vercel） |
| **dev（本地）** | `DATABASE_URL=file:./data/dev.db` | `.env.local` **不得**含 `TURSO_DATABASE_URL` |
| **test（单元）** | `:memory:` | vitest |
| **test（E2E）** | `file:./.e2e-test.db` | Playwright 清空 `TURSO_*` 并设 `DATABASE_URL` |

- **dev 护栏**：`getClient()` 在非生产环境下若检测到 `TURSO_DATABASE_URL` 指向远程 Turso（`turso.io`/`turso.tech`），**直接抛错**，防止本地误连生产库。生产环境（`NODE_ENV=production`）不受此限制。
- **启动身份日志**：连接建立时打印 `[db] turso → …` 或 `[db] sqlite → …`，一眼看清当前连的是哪个库。
- **dev 自动迁移**：`npm run dev` 脚本为 `tsx scripts/migrate.ts && next dev`，首次启动自动建表，无需手动 migrate。
- **E2E 隔离（关键）**：`playwright.config.ts` 的 `webServer.env` 显式清空 `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` 并设 `DATABASE_URL=file:./.e2e-test.db`，且启动前先 `npm run migrate` 建本地表。**E2E 绝不连接生产 Turso 库**，跑完自动删除 `.e2e-test.db`。切勿移除该隔离——否则测试数据会写入生产库（曾发生过的事故）。

### 环境切换（主 ↔ 备）

两个生产环境数据独立。若阿里云不续费、需切回 Vercel 备用：在主生产「设置 → 备份」导出 JSON，再到 Vercel 实例「设置 → 恢复」导入即可。无需改代码（STORAGE_DRIVER 默认 vercel）。

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `TURSO_DATABASE_URL` | 备用生产必需 | Turso 数据库地址（主生产 Docker 显式清空此变量） |
| `TURSO_AUTH_TOKEN` | 备用生产必需 | Turso 认证 Token |
| `APP_PASSWORD` | 否 | 登录密码（不设置则跳过认证，.env.example 默认 `demo`）|
| `BLOB_READ_WRITE_TOKEN` | 否（附件功能） | Vercel Blob 存储 Token（仅备用生产用） |
| `DATABASE_URL` | 本地/主生产必需 | 本地 SQLite 路径。dev 用 `file:./data/dev.db`；主生产 Docker 用 `file:./data/db/lifeos.db`；E2E 用 `file:./.e2e-test.db`；单元测用 `:memory:` |
| `STORAGE_DRIVER` | 否 | `local`（主生产 Docker，本地磁盘）/ `vercel`（默认，Vercel Blob） |

## WSL2 环境说明

本项目运行在 WSL2 中，WSL2 有独立的虚拟 IP（如 `192.168.82.x`），无法从局域网其他设备直接访问。

- **PC 端开发**：Windows 浏览器打开 `http://localhost:3000`（Windows 自动转发到 WSL2）
- **手机端测试**：`npm run dev` 后手机访问 `http://<LAN-IP>:3000`（`next.config.ts` 已配置 `allowedDevOrigins: ['*']`）
- **主生产部署**：阿里云 ECS 上 `docker compose up -d`（见 `DEPLOY.md`）
- **备用部署**：`git push origin main` → Vercel 自动部署

## 添加新模块

1. 在 `lib/types.ts` 扩展类型（如果需要）
2. 在 `lib/db/` 下对应文件添加数据库操作方法（或新建模块文件并在 index.ts 重导出）
3. 在 `app/` 下创建新页面
4. 在 `lib/navigation.ts` 添加导航项
5. 构建验证：`npm run build`

## 测试

```bash
npm test          # vitest 单元测试（9 文件，141 测试）
npm run test:e2e  # Playwright E2E（13 测试，见下）
```

### E2E 测试（Playwright）

- 测试目录：`e2e/`，套件：`smoke` / `notes` / `budgets` / `habits`（共 13 个测试）
- 覆盖：登陆重定向与 PWA manifest、笔记 CRUD + 搜索 + 标签 + 置顶、预算设置与结算、习惯创建/打卡/删除
- 运行方式：`npm run test:e2e`（自动启动 `npm run dev` 作为 webServer）
- **认证绕过**：测试以空 `APP_PASSWORD` 启动 dev server，`app/api/auth` 在 `APP_PASSWORD` 为空时自动放行，因此测试可直接访问受保护页面，无需登录
- **数据库隔离（关键）**：`playwright.config.ts` 的 `webServer.env` 显式清空 `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` 并设 `DATABASE_URL=file:./.e2e-test.db`，且启动前先 `npm run migrate` 建本地表。**E2E 绝不连接生产 Turso 库**，跑完自动删除 `.e2e-test.db`。切勿移除该隔离——否则测试数据会写入生产库（曾发生过的事故）
- **辅助工具**：`e2e/helpers.ts` 提供 `BASE_URL`、API 建数据/清理、自动认证等
- **本地 Chromium 系统库**：本环境缺少 `libnspr4` / `libnss3` / `libasound2`，已将对应 `.so` 解压至 `.pw-libs/lib/` 并在 `test:e2e` 脚本中自动注入 `LD_LIBRARY_PATH`（该目录已加入 `.gitignore`，不提交）
- 测试产物 `playwright-report/` 与 `test-results/` 已加入 `.gitignore`


