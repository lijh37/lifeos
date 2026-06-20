# LifeOS - AI 生活助手

你的个人 AI 生活助手，支持自然语言记录笔记、管理任务、追踪生活。手机和 PC 均可使用。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: DeepSeek API (OpenAI 兼容接口)
- **数据库**: SQLite (本地) / Turso (云端同步)
- **状态管理**: Zustand
- **部署**: Vercel

## 快速开始

### 1. 安装依赖

```bash
nvm use 24
npm install
```

### 2. 配置环境变量

复制 `.env.local` 文件，填入你的 DeepSeek API Key：

```env
DEEPSEEK_API_KEY=sk-your-key-here
DATABASE_URL=file:./data/life.db
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 手机预览

#### 方式一：端口转发（推荐，WSL2 用户）

项目运行在 WSL2 中时，手机无法直接访问 WSL2 的虚拟 IP。需要在 **Windows 中以管理员身份** 运行：

```powershell
# PowerShell (管理员)
.\setup-wsl.ps1
```

或双击 `wsl-port-forward.bat`（以管理员运行）。

然后手机访问 `http://[Windows主机IP]:3000`（查看主机 IP：Windows 上运行 `ipconfig`）。

#### 方式二：启动本地隧道

```bash
npm install -g localtunnel
lt --port 3000
# 会输出一个 https://xxx.loca.lt 地址，手机访问即可
```

## 功能

### MVP（已完成）
- [x] AI 对话式笔记 — 自然语言输入，AI 自动解析为结构化笔记/任务/事件
- [x] 笔记浏览 — 按类型筛选（笔记/任务/事件）、搜索
- [x] 任务管理 — 标记完成/未完成、按截止日期排序
- [x] 多端自适应 — PC 侧栏导航 + 手机底部 Tab + PWA
- [x] 多端同步 — 通过 Turso 实现（可选）

### 规划中
- [ ] 收支管理 — AI 记账，自动分类
- [ ] 饮食+锻炼追踪 — 拍照识食物，运动记录
- [ ] 习惯养成 — AI 分析规律，主动建议
- [ ] 工作助手 — 会议纪要，日报自动生成

## 项目结构

```
opencode-demo/
├── app/
│   ├── layout.tsx        # 全局布局（侧栏 + 底部导航）
│   ├── page.tsx          # AI 对话首页
│   ├── notes/page.tsx    # 笔记列表
│   ├── tasks/page.tsx    # 任务列表
│   └── api/
│       ├── chat/route.ts    # DeepSeek 流式对话
│       ├── notes/route.ts   # 笔记 CRUD
│       └── notes/[id]/route.ts
├── components/
│   ├── ui/               # shadcn 组件
│   ├── chat.tsx          # AI 对话组件
│   ├── note-list.tsx     # 笔记/任务列表组件
│   └── sidebar.tsx       # 导航组件
├── lib/
│   ├── db.ts             # 数据库操作
│   ├── types.ts          # TypeScript 类型
│   └── prompts.ts        # AI 提示词
├── store/
│   └── index.ts          # Zustand 状态管理
└── public/
    ├── manifest.json     # PWA 配置
    └── icons/            # 应用图标
```

## 如何与 AI 对话

直接在输入框用自然语言描述，AI 会自动理解并记录：

```
"明天下午3点和张三开会讨论项目进度"
→ 创建事件 + 设置提醒

"吃了午饭，花了35块"
→ 创建笔记 + 标签 [饮食, 支出]

"提醒我今晚8点锻炼"
→ 创建任务 + 截止时间

"我上周完成了什么"
→ 查询历史记录并生成总结
```

## 数据同步

默认使用本地 SQLite（`data/life.db`）。如需多端同步：

1. 注册 [Turso](https://turso.tech)
2. 创建数据库：`turso db create life-app`
3. 获取连接信息
4. 更新 `.env.local` 中的 `DATABASE_URL` 和 `TURSO_AUTH_TOKEN`

## 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Fork 或推送代码到 GitHub
2. 在 Vercel 导入项目
3. 添加环境变量 `DEEPSEEK_API_KEY`
4. 部署完成
