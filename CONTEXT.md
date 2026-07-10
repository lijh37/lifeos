# LifeOS — 对话上下文

> 每次会话开始时读取此文件获取上下文。每次会话结束时更新。

## 项目概况

LifeOS 是一个个人生活助手应用。支持笔记管理、预算规划和习惯养成。

技术栈：Next.js 16 (App Router) + React 19 + Tailwind v4 + @libsql/client + Zustand v5 + date-fns v4 + lucide-react

## 已完成工作

### 迭代 1 — 稳定性加固 (已完成)
- 笔记置顶、initDB 缓存
- 修复竞态条件

### 迭代 2 — 测试体系建设 (52 tests, 5 files)
- Unit: db(27), utils(5), store(10), note-list(5), budget-habit(10)

### 迭代 3 — 架构升级 (已完成)
- 游标分页 + 无限滚动 + FTS5 搜索 + 标签规范化 + LRU 缓存

### 笔记置顶
- 移除拖拽排序（`sort_order` 列 + 相关 API/交互全部删除）
- 新增 `pinned` 布尔字段
- NoteList 默认置顶优先排列（`ORDER BY pinned DESC, created_at DESC`）
- 游标分页 cursor 格式改为 JSON `{ p, c }` 以支持置顶排序
- 笔记卡片 Pin/PinOff 按钮一键切换置顶

### 附件上传 (已完成)
- DB: `attachments` 表 + CRUD 函数
- API 端点和前端上传界面

### Markdown 编辑器 (已完成)
- `lib/markdown.tsx` — MarkdownRenderer（react-markdown + Tailwind 样式）
- `components/markdown-editor.tsx` — 分栏编辑 + 工具栏 (Bold/Heading/List/Quote/Link/Code)，桌面分屏 + 手机 Tab 切换，自动保存
- `app/notes/[id]/page.tsx` — 全页笔记编辑器（标题、标签、删除）
- 导出直接输出 YAML frontmatter + Markdown 正文

### 标签增强
- `renameTag` 合并标签时去重（`Set` 去重避免重复标签）
- `deleteTag` 新增删除标签函数，自动清理笔记 JSON 列中的标签

### 笔记列表优化
- loading 拆分为 `initialLoading` / `loadingMore` 两个状态
- 搜索添加防抖（300ms）+ AbortController 取消竞态
- 搜索状态显示旋转加载图标
- 虚拟列表（`@tanstack/react-virtual`）虚拟滚动（>50 条时启用）
- 滚动位置恢复（sessionStorage 保存/还原）
- 分页按钮独立加载指示
- 批量删除添加 confirm 确认

### 笔记 UI 优化
- Toast 通知系统：`sonner` + 全局 Toaster，pin/delete/batch/create/保存失败均有 toast 反馈
- AlertDialog 确认弹窗：基于 `@base-ui/react/alert-dialog` 创建 `components/ui/alert-dialog.tsx`，替换原生 `confirm()`（单条/批量删除）
- 保存状态指示器：笔记详情标题自动保存时显示旋转图标 + "保存中"
- 返回按钮 fallback：`router.back()` 无历史记录时回退到 `/notes`
- 标签操作回滚：添加/移除标签失败时回滚 UI 和数据
- NoteCard 间距优化：`p-3` → `p-4`，标题 `truncate` 防止溢出
- BatchActionsBar 移动端偏移：`max-md:bottom-[calc(56px+env(safe-area-inset-bottom))]` 确保不被底部导航遮挡
- 无限滚动修复：onScroll → IntersectionObserver（Base UI ScrollArea 自定义滚动条导致 onScroll 不可靠）

### AI 功能移除
- 移除整个 AI 对话模块（chat API、组件、页面、库文件）
- 移除 rate-limiter、prompts、ai-tools、db/chat
- 导航从 8 项精简为 5 项（笔记/预算/习惯/标签/设置）
- 删除 `app/stats/` 统计页面

## 已知限制
- 笔记列表每页 20 条（cursor 分页），滚动/按钮加载更多，缓存上限 500 条
- 列表 API 带 `summary=true` 只返回正文前 80 字符（不含完整正文），保证加载速度
- 导出默认取全部笔记（上限 1000），超限需批量导出
- 搜索结果不支持游标分页（仅首次查询）
- 笔记列表无限滚动改用 IntersectionObserver（sentinel 元素 + rootMargin 400px）
- 编辑器预览/编辑分栏模式固定 1:1 比例，不支持拖拽调整

## 剩余方向
1. 导入改进：接受单文件 `.md` 格式（YAML 解析）
2. 标签批量整理
3. E2E 测试用例编写
4. 移动端搜索框可改为点击展开模式（参考 iOS 备忘录）
