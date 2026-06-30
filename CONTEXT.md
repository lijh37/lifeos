# LifeOS — 对话上下文

> 每次会话开始时读取此文件获取上下文。每次会话结束时更新。

## 项目概况

LifeOS 是一个个人笔记知识库应用，以 Markdown 笔记为核心，辅以预算和习惯追踪。

技术栈：Next.js 16 (App Router) + React 19 + Tailwind v4 + AI SDK v7 + @libsql/client + Zustand v5 + TipTap (富文本)

## 已完成工作

### 迭代 1 — 稳定性加固 (6/6)
- chat.tsx 竞态条件修复、rate-limiter 内存泄漏、rich-editor 闭包陷阱
- 拖拽排序持久化、initDB 缓存

### 迭代 2 — 测试体系建设 (58 tests, 6 files)
- Unit: rate-limiter(6), db(18), prompts(4), chat(13), note-list(9), chat-rendering(5)
- CI: `.github/workflows/ci.yml`

### 迭代 3 — 架构升级 (7/7)
- 游标分页 + 无限滚动 + FTS5 搜索 + 标签规范化 + LRU 缓存 + AI 模型可配置

### 迭代 4 — AI 增强 (3/3)
- AI SDK v6→v7 升级
- Function Calling: createEntry + createHabit 服务端执行（后续已移除）
- 上下文窗口裁剪 (last 40) + maxOutputTokens: 2048

### AI 查询工具 (5 tools)
- `searchNotesByKeyword` / `searchHabitsByKeyword` / `getNotesInDateRange`
- `getHabitProgress` / `getBudgetInfo`
- AI 只查不写（2026-06-30 移除 createEntry / createHabit）

### 命令菜单 Cmd+K
- `components/command-menu.tsx` — Cmd+K 全局唤出，搜索+导航+快捷操作

### 附件上传 (完成)
- DB: `attachments` 表，API: POST/GET/DELETE `/api/upload`
- 本地文件系统 `public/uploads/`，RichEditor 图片上传

### Markdown 编辑器 (完成)
- `lib/markdown.tsx` — MarkdownRenderer（react-markdown + Tailwind 样式）
- `components/markdown-editor.tsx` — 分栏编辑 + 工具栏 (Bold/Heading/List/Quote/Link/Code)
- `app/notes/[id]/page.tsx` — 全页笔记编辑器（标题、标签、删除）
- 导出直接输出 YAML frontmatter + Markdown 正文
- 旧 HTML 笔记已迁移为 Markdown（`scripts/convert-html-to-md.ts`）

### 精简重构 (2026-06-30)
- AI 从"自动创建"变为"只查不写"：移除 `createEntry` 和 `createHabit` 工具
- Chat 组件去掉自动创建逻辑、JSON 回退、类型徽标
- 侧栏去掉「任务」和「日历」导航
- 笔记列表默认只显示 `type: 'note'`，移除任务完成/撤销 UI
- 导出格式改为：H2 标题行 + 北京时间 + 干净 Markdown

### 批量导入 (2026-06-30)
- `scripts/import-notes-from-md.ts` — 解析 笔记.md→Turso 316 条笔记
- 格式：`时间戳\n---\n### 标题：xxx\n\n内容：...`

## Oracle 代码审查
- 迭代 3: 7 问题，修复 3 个
- 迭代 4: 14 项建议，全部采纳

## 已知限制
- 笔记列表每页 100 条，滚动加载更多，缓存上限 500 条
- 列表 API 带 `summary=true` 只返回正文前 80 字符（不含完整正文），保证加载速度
- 导出默认取全部笔记（上限 1000），超限需批量导出

## 剩余方向
1. 导入改进：接受单文件 `.md` 格式（YAML 解析）
2. 跨对话记忆/RAG
3. 标签批量整理
