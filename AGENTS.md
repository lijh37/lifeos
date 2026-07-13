<!-- LifeOS - 生活助手 -->

# 项目概况

LifeOS 是一个个人生活助手应用。支持笔记管理、预算规划和习惯养成。

## 技术栈

- **框架**：Next.js 16 (App Router), TypeScript
- **UI 组件**：Tailwind CSS v4 + shadcn/ui (`base-nova` 风格，底层使用 `@base-ui/react` 而非 Radix)
- **数据库**：`@libsql/client`（Turso 云端 libSQL）
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
  ├── layout.tsx      # 根布局（ThemeProvider + Sidebar + MobileNav + PwaHandler + PageAnimation + Toaster）
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
  ├── api/habits/     # 习惯 CRUD + 打卡 + streaks + 趋势 + 统计
  ├── api/backup/     # 备份导出/恢复 JSON（FK 安全顺序清空/导入）
  ├── api/tags/       # 标签列表/重命名/删除
  ├── api/export/     # 导出全部笔记为 Markdown 文件
  ├── api/auth/       # 密码验证（cookie 30 天）
  ├── notes/          # 笔记列表页（批量选择+搜索+置顶+无限滚动+标签筛选）
  │   ├── page.tsx    # 客户端组件
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
  ├── note-list.tsx     # 笔记列表（批量操作 + 搜索 + 置顶 + 按标签筛选 + 无限滚动，>50 项自动切虚拟列表）
  ├── note-card.tsx     # 单条笔记卡片（memo，标题/摘要/标签/日期/置顶/选择/悬停预取）
  ├── virtual-note-list.tsx # 虚拟滚动列表（memo，@tanstack/react-virtual，>50 项时启用）
  ├── batch-actions-bar.tsx # 批量操作栏（删除/加标签 AlertDialog 确认）
  ├── tag-manager-sheet.tsx # 标签管理 Sheet（列表/内联重命名/删除/点击筛选）
  ├── attachment-section.tsx # 附件区（拖拽上传/缩略图/文件类型图标/乐观删除）
  ├── markdown-editor.tsx # Markdown 编辑器（分栏/编辑/预览三模式切换 + 6 工具栏 + 500ms 自动保存）
  ├── sidebar.tsx       # 导航（PC 侧栏 + 手机底部栏，4 项导航使用 lib/navigation）
  ├── budget-card.tsx   # 预算卡片（memo，月度汇总/超额提示/完成标记）
  ├── budget-form.tsx   # 预算表单（固定+可变预算输入/实时合计/¥ 前缀）
  ├── progress-bar.tsx  # 进度条（memo，三色：绿/<85% 橙/85-100% 红/超额）
  ├── format-note-date.ts # 日期格式化工具（中文相对时间："刚刚、X分钟前、昨天...")
  ├── error-boundary.tsx # React Error Boundary（含重试按钮）
  ├── theme-provider.tsx # 主题上下文（light/dark/system，localStorage 持久化）
  ├── theme-toggle.tsx  # 深色模式切换（Sun/Moon/Monitor 三态循环）
  ├── pwa-handler.tsx   # PWA 安装管理（beforeinstallprompt useRef 保存 + 离线黄色横幅）
  ├── page-animation.tsx # 页面过渡动效（useSelectedLayoutSegment key 驱动 fadeIn）
  └── skeleton-card.tsx # 骨架屏（SkeletonNoteList / SkeletonHabits）
lib/                    # 核心逻辑
  ├── db/               # 数据库模块（通过 index.ts 重导出）
  │   ├── client.ts     # getClient() + initDB()（7 表 + FTS5 + 10 索引 + 3 触发器）
  │   ├── notes.ts      # 笔记 CRUD + FTS5 搜索 + 游标/偏移分页 + 日期范围查询
  │   ├── habits.ts     # 习惯 CRUD + 打卡 + streaks + 最佳记录 + 周/月统计
  │   ├── budgets.ts    # 预算 CRUD（upsert）
  │   ├── tags.ts       # 标签同步(syncNoteTags) + getAllTags(含计数) + renameTag(合并) + deleteTag
  │   ├── attachments.ts # 附件 CRUD（createAttachment / getAttachmentsByNoteId / deleteAttachment）
  │   └── index.ts      # 重导出（import from '@/lib/db'）
  ├── types.ts          # TypeScript 类型（Note/Budget/Habit/Attachment）
  ├── markdown.tsx      # MarkdownRenderer（react-markdown + Tailwind 样式）+ stripMarkdown
  ├── navigation.ts     # 共享导航配置（NAV_ITEMS 4 项 / PRIMARY_MOBILE_NAV / MORE_MOBILE_NAV）
  └── utils.ts          # cn() + genId() + cn 内部使用 tailwind-merge + clsx
store/                  # Zustand 全局状态
  ├── index.ts          # useAppStore（笔记列表缓存，MAX_CACHED_NOTES=500，5 个 action）
  └── __tests__/        # 状态管理测试（6 测试）
lib/__tests__/          # 库测试
  ├── db.test.ts        # 数据库测试（22 测试：笔记7 + 习惯4 + 预算3 + 搜索与标签8）
  └── utils.test.ts     # 工具函数测试（5 测试）
components/__tests__/   # 组件测试
  ├── note-list.test.tsx     # 笔记列表组件测试（5 测试）
  ├── budget-habit.test.tsx  # 预算/习惯组件测试（9 测试：ProgressBar3 + BudgetCard3 + HabitRow3）
  └── markdown-editor.test.tsx # Markdown 编辑器测试（25 测试：基础3+自动保存4+工具栏8+视图5+移动端2+生命周期2+渲染1）
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
- 详情见 `lib/db/client.ts` 的 `initDB()`

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
- 新组件提取后遵循：功能性函数（如 ProgressBar/formatNoteDate）→ 模块级函数；有状态的 → 独立函数组件

### PWA 约定

- 使用 **原生 `beforeinstallprompt`** 事件实现安装提示（事件对象存于 `useRef`，非 state）
- `components/pwa-handler.tsx`：显示安装横幅和离线提示（黄色 "当前离线" 横幅）
- 注意：**无 Service Worker**（`public/sw.js` 已在清理中被移除），因此无离线缓存能力
- `public/manifest.json`：standalone 模式，portrait 锁定，192x192 + 512x512 PNG 图标
- PWA 安装按钮使用 `onClick`（非 `onPointerDown`）

## 部署

- **生产环境**：`https://opencode-demo.vercel.app`（Vercel，部署区域 `hkg1` 香港）
- **云端数据库**：Turso（`libsql://lifeos-lijh37.aws-ap-northeast-1.turso.io`）
- **文件存储**：Vercel Blob（需配置 `BLOB_READ_WRITE_TOKEN` 环境变量）
- **密码保护**：`proxy.ts`（Next.js 16 Middleware，matcher 匹配全部路由）+ `/login` 页 + `/api/auth` 接口
  - 认证方式：`app_auth` cookie（30 天）/ `Authorization: Bearer` 头
  - 公开路径免认证：`/login`, `/api/auth`, `/manifest.json`, `/icons/`, `/uploads/`
  - 未认证 API 返回 401 JSON；未认证页面重定向到 `/login?from=<original_path>`
  - 若 `APP_PASSWORD` 未设置，则自动跳过认证

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `TURSO_DATABASE_URL` | 是 | Turso 数据库地址 |
| `TURSO_AUTH_TOKEN` | 是 | Turso 认证 Token |
| `APP_PASSWORD` | 否 | 登录密码（不设置则跳过认证，.env.example 默认 `demo`）|
| `BLOB_READ_WRITE_TOKEN` | 否（附件功能） | Vercel Blob 存储 Token |
| `DATABASE_URL` | 否 | 本地 SQLite 路径（仅 CI 测试用，默认使用 `:memory:`）|

## WSL2 环境说明

本项目运行在 WSL2 中，WSL2 有独立的虚拟 IP（如 `192.168.82.x`），无法从局域网其他设备直接访问。

- **PC 端开发**：Windows 浏览器打开 `http://localhost:3000`（Windows 自动转发到 WSL2）
- **手机端测试**：`npm run dev` 后手机访问 `http://<LAN-IP>:3000`（`next.config.ts` 已配置 `allowedDevOrigins: ['*']`）
- **生产部署**：`git push origin main` → Vercel 自动部署

## 添加新模块

1. 在 `lib/types.ts` 扩展类型（如果需要）
2. 在 `lib/db/` 下对应文件添加数据库操作方法（或新建模块文件并在 index.ts 重导出）
3. 在 `app/` 下创建新页面
4. 在 `lib/navigation.ts` 添加导航项
5. 构建验证：`npm run build`

## 测试

```bash
npm test          # vitest 单元测试（6 文件，72 测试）
npm run test:e2e  # Playwright E2E（TODO）
```


