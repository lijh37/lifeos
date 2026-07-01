# LifeOS — 对话上下文

> 每次会话开始时读取此文件获取上下文。每次会话结束时更新。

## 项目概况

LifeOS 是一个个人 AI 生活助手应用。用户通过自然语言与 AI 对话，AI 可查询笔记、习惯和预算数据并回答用户问题。（当前模式：AI 只查不写）

技术栈：Next.js 16 (App Router) + React 19 + Tailwind v4 + AI SDK v7 + @libsql/client + Zustand v5 + date-fns v4 + lucide-react

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

### AI 查询工具（5 个 Function Calling 工具）
- `searchNotesByKeyword` / `searchHabitsByKeyword` / `getNotesInDateRange`
- `getHabitProgress` / `getBudgetInfo`
- AI 只查不写（2026-06-30 移除 createEntry / createHabit）
- 工具定义文件：`lib/ai-tools.ts`

### 命令菜单 Cmd+K (完成)
- `components/command-menu.tsx` — Cmd+K 全局唤出，键盘导航，跨类型搜索+页面导航+快捷操作

### 附件上传 (DB 层完成，待前端集成)
- DB: `attachments` 表 + CRUD 函数（已完成）
- API 端点和前端上传界面（待实现）

### Markdown 编辑器 (完成)
- `lib/markdown.tsx` — MarkdownRenderer（react-markdown + Tailwind 样式）
- `components/markdown-editor.tsx` — 分栏编辑 + 工具栏 (Bold/Heading/List/Quote/Link/Code)，桌面分屏 + 手机 Tab 切换，自动保存
- `app/notes/[id]/page.tsx` — 全页笔记编辑器（标题、标签、删除）
- 导出直接输出 YAML frontmatter + Markdown 正文

### 精简重构 (2026-06-30)
- AI 从"自动创建"变为"只查不写"：移除 `createEntry` 和 `createHabit` 工具
- Chat 组件去掉自动创建逻辑、JSON 回退、类型徽标
- 侧栏去掉「任务」和「日历」导航（从 10 项减为 8 项）
- 笔记列表默认只显示 `type: 'note'`，移除任务完成/撤销 UI
- 导出格式改为：H2 标题行 + 北京时间 + 干净 Markdown
- 删除 `app/tasks/`、`app/calendar/` 废弃路由页面
- 删除 `scripts/https-setup.sh`、`scripts/migrate-to-turso.ts` 等已废弃脚本

### 批量导入 (2026-06-30)
- 一次性脚本（已执行完毕，未保留在仓库中）
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
