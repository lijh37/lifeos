<!-- LifeOS - AI 生活助手 -->

# 项目概况

> 首次进入会话请先阅读 `CONTEXT.md` 获取完整上下文。

# 项目概况

LifeOS 是一个个人 AI 生活助手应用。用户通过自然语言与 AI 对话，AI 自动解析为结构化笔记、任务或事件。

## 技术栈

- Next.js 16 (App Router), TypeScript
- Tailwind CSS + shadcn/ui (UI 组件)
- DeepSeek API (AI 推理)
- @libsql/client (数据库)
- Zustand (客户端状态管理)
- date-fns (日期处理)
- lucide-react (图标)

## 目录结构

```
app/                  # Next.js App Router 页面和 API
  ├── api/chat/       # DeepSeek 流式对话接口
  ├── api/notes/      # 笔记 CRUD 接口
  ├── notes/          # 笔记列表页
  ├── tasks/          # 任务列表页
  ├── expenses/       # 记账页面
  ├── habits/         # 习惯页面
  └── calendar/       # 日历视图页面
components/           # React 组件
  ├── ui/             # shadcn 基础组件
  ├── chat.tsx        # AI 对话组件（核心）
  ├── note-list.tsx   # 笔记/任务列表
  ├── sidebar.tsx     # 导航（PC 侧栏 + 手机底部栏）
  ├── export-button.tsx # 导出按钮（MD/JSON/CSV）
  └── theme-toggle.tsx  # 深色模式切换
lib/                  # 核心逻辑
  ├── db.ts           # 数据库操作
  ├── types.ts        # TypeScript 类型定义
  └── prompts.ts      # AI 系统提示词
store/                # Zustand 全局状态
```

## 关键约定

### AI 对话格式

AI 回复必须是纯 JSON 格式，由 `lib/prompts.ts` 中的 SYSTEM_PROMPT 控制：

```json
{
  "type": "note | task | event",
  "title": "提取的标题",
  "tags": ["标签"],
  "dueDate": "ISO日期或null",
  "summary": "对用户的回复",
  "isNewEntry": true
}
```

### 数据库

使用 `@libsql/client` 直接操作，有两个表：
- `notes` — 笔记/任务/事件（通过 type 字段区分）
- `chat_messages` — 聊天历史

### AI SDK 版本

使用 AI SDK v6（`@ai-sdk/react` + `ai`），注意：
- `useChat` 从 `@ai-sdk/react` 导入
- 服务端使用 `convertToModelMessages`（async）和 `toUIMessageStreamResponse()`
- 客户端使用 `DefaultChatTransport` 配置 API 端点
- 消息内容通过 `message.parts` 获取（而非 `message.content`）

## WSL2 环境说明

本项目运行在 WSL2 中，WSL2 有独立的虚拟 IP（如 `192.168.82.x`），无法从局域网其他设备直接访问。

- **PC 端开发**：Windows 浏览器打开 `http://localhost:3000`（Windows 自动转发到 WSL2）
- **手机端测试**：需执行 `setup-wsl.ps1`（Windows 管理员 PowerShell）设置端口转发，或用 `localtunnel` 创建公网隧道

## 添加新模块

1. 在 `lib/types.ts` 扩展类型（如果需要）
2. 在 `lib/db.ts` 添加数据库操作方法
3. 在 `lib/prompts.ts` 更新 AI Prompt 以支持新功能
4. 在 `app/` 下创建新页面
5. 在 `components/sidebar.tsx` 添加导航项
