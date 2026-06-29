# LifeOS — 对话上下文

> 每次会话开始时读取此文件获取上下文。每次会话结束时更新。

## 项目概况

LifeOS 是一个个人 AI 生活助手应用。用户通过自然语言与 AI 对话，AI 自动解析为结构化笔记、任务、事件或习惯。

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
- AI SDK v6→v7 升级 (`ai` 7.0.4, `@ai-sdk/react` 4.0.2, `@ai-sdk/openai` 4.0.0)
- Function Calling: createEntry + createHabit 服务端执行，客户端保留 JSON 回退
- 上下文窗口裁剪 (last 40) + maxOutputTokens: 2048

### AI 查询工具 (5 tools)
- `searchNotesByKeyword` / `searchHabitsByKeyword` / `getNotesInDateRange`
- `getHabitProgress` / `getBudgetInfo`
- prompts.ts 更新为 7 工具模式 + 查询/创建规则

### 命令菜单 Cmd+K
- `components/command-menu.tsx` — Cmd+K 全局唤出，搜索+导航+快捷操作
- 响应式: 桌面居中卡片，移动端全屏
- 键盘导航 (↑↓/Enter/Escape)

### 附件上传 (完成)
- DB: `attachments` 表 (note_id, filename, url, mime_type, file_size)
- API: POST/GET/DELETE `/api/upload`
- 存储: `public/uploads/` 本地文件系统
- UI: RichEditor 图片上传按钮 + TipTap ImageExtension + loading 状态

### 移动端优化 (完成)
- MobileNav: 10项→4主项+「更多」Sheet (3列网格)
- 触控目标: min-h-[56px] (远超 44px)
- 安全区域: `env(safe-area-inset-bottom)` 全路径覆盖
- iOS 缩放: 所有输入框 `text-base` 最低字号
- 卡片悬浮: `@media (hover: hover)` 避免滚动抖动

## Oracle 代码审查
- 迭代 3: 7 问题，修复 3 个
- 迭代 4: 14 项建议，全部采纳

## 剩余方向
1. E2E 测试更新适配工具调用
2. 跨对话记忆/RAG
3. i18n
