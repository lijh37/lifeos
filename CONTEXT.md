# LifeOS — 对话上下文

> 每次会话开始时读取此文件获取上下文。每次会话结束时更新。

## 项目概况

LifeOS 是一个个人 AI 生活助手应用。用户通过自然语言与 AI 对话，AI 可查询笔记、习惯和预算数据并回答用户问题。（当前模式：AI 只查不写）

技术栈：Next.js 16 (App Router) + React 19 + Tailwind v4 + AI SDK v7 + @libsql/client + Zustand v5 + date-fns v4 + lucide-react

## 已完成工作

### 迭代 1 — 稳定性加固 (6/6)
- chat.tsx 竞态条件修复、rate-limiter 内存泄漏、rich-editor 闭包陷阱
- 笔记置顶、initDB 缓存

### 迭代 2 — 测试体系建设 (69 tests, 7 files)
- Unit: rate-limiter(6), db(27), chat(13), utils(1), store(12), note-list(6), budget-habit(4)
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
- 工具返回结果现已包含 `tags` 字段（2026-07-03）
- 工具定义文件：`lib/ai-tools.ts`

### 笔记置顶 (2026-07-03)
- 移除拖拽排序（`sort_order` 列 + `app/api/notes/reorder/` API + NoteList 拖拽交互全部删除）
- 新增 `pinned` 布尔字段（`lib/db/client.ts` 中 notes 表 ALTER TABLE 添加）
- NoteList 默认置顶优先排列（`ORDER BY pinned DESC, created_at DESC`）
- 游标分页 cursor 格式改为 JSON `{ p, c }` 以支持置顶排序（向后兼容纯字符串）
- 笔记卡片 Pin/PinOff 按钮一键切换置顶

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

### 标签增强 (2026-07-03)
- `renameTag` 合并标签时去重（`Set` 去重避免重复标签）
- `deleteTag` 新增删除标签函数，自动清理笔记 JSON 列中的标签
- `lib/db/tags.ts` 同步失败日志改进（输出 noteId + tags）

### 笔记列表优化 (2026-07-03)
- loading 拆分为 `initialLoading` / `loadingMore` 两个状态
- 搜索添加防抖（300ms）+ AbortController 取消竞态
- 搜索状态显示旋转加载图标
- 虚拟列表（`@tanstack/react-virtual`）虚拟滚动（>50 条时启用）
- 滚动位置恢复（sessionStorage 保存/还原）
- 分页按钮独立加载指示
- 批量删除添加 confirm 确认

### Markdown 编辑器优化 (2026-07-03)
- 工具栏简化，去除多余边框线
- 按钮大小统一 h-8/w-8，图标大小统一 h-4/w-4
- 预览空态居中显示"预览区域"文本
- 编辑器区域添加 `min-w-0` 防止溢出
- PC 分栏模式预览区域添加 `overflow-x-hidden`

### 页面布局修复 (2026-07-03)
- `globals.css` 移除 `will-change: transform, opacity`（避免 GPU 层提升导致的边缘模糊）
- `body` 添加 `overflow-x-hidden` 防止水平溢出
- PageAnimation 添加 `min-w-0 flex-1` 保证内容区自适应
- `layout.tsx` main 去除 `flex-1`（交给 PageAnimation 统一管理）

### 导入增强 (2026-07-03)
- `app/api/import/route.ts` 导入时支持 `pinned` 字段

### 统计接口简化 (2026-07-03)
- 标签统计改用 `getAllTags()` 替代手动 JSON 解析
- 移除 `getNotesCountByType` 调用（API 响应不再返回 total/offset）

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
- 笔记列表每页 20 条（cursor 分页），滚动/按钮加载更多，缓存上限 500 条
- 列表 API 带 `summary=true` 只返回正文前 80 字符（不含完整正文），保证加载速度
- 导出默认取全部笔记（上限 1000），超限需批量导出
- 搜索结果不支持游标分页（仅首次查询）

## 剩余方向
1. 导入改进：接受单文件 `.md` 格式（YAML 解析）
2. 跨对话记忆/RAG
3. 标签批量整理
4. 附件上传前端集成（DB 层已完成）
