# LifeOS - AI 生活助手

你的个人 AI 生活助手，支持自然语言记录笔记、管理任务、记账、养成习惯。手机和 PC 均可使用，支持深色模式、数据导出和离线访问。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: DeepSeek API (OpenAI 兼容接口)
- **数据库**: SQLite (本地) / Turso (云端同步)
- **状态管理**: Zustand
- **日期处理**: date-fns
- **图标**: lucide-react
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

### 已实现
- [x] AI 对话式记录 — 自然语言输入，AI 自动解析为笔记/任务/事件/收支/习惯
- [x] 笔记管理 — 按类型筛选、搜索、标记完成、删除
- [x] 任务管理 — 标记完成/未完成，按截止日期排序
- [x] 收支管理 — AI 自动分类记账（餐饮/交通/购物等），月度统计 + 分类柱状图
- [x] 习惯养成 — AI 创建习惯，每日打卡，连续天数 streak 徽章
- [x] 日历视图 — 月历网格，彩色圆点标记条目类型，点击查看当日详情
- [x] 全局搜索 — 跨笔记/收支/习惯全文搜索，防抖 300ms
- [x] 统计看板 — 数据概览、分类图表、热门标签、动态时间线
- [x] 标签管理 — 查看/重命名/删除标签
- [x] 数据导出 — Markdown / JSON / CSV（Excel 中文友好）
- [x] 深色模式 — light/dark/system 三态切换
- [x] 离线支持 — Service Worker 缓存 + PWA 安装提示
- [x] 数据管理 — 设置页：数据清除、备份导出/导入恢复
- [x] UI 动效 — 页面过渡、骨架屏、交错入场、卡片悬浮
- [x] 多端自适应 — PC 侧栏导航 + 手机底部 Tab

### 规划中
- [ ] 多端同步 — Turso 云端同步 + Vercel 部署
- [ ] 饮食+锻炼追踪 — 拍照识食物，运动记录
- [ ] 通知提醒、富文本编辑

## 项目结构

```
opencode-demo/
├── app/
│   ├── page.tsx              # AI 对话首页
│   ├── notes/page.tsx        # 笔记列表
│   ├── tasks/page.tsx        # 任务列表
│   ├── expenses/page.tsx     # 记账页面
│   ├── habits/page.tsx       # 习惯页面
│   ├── calendar/page.tsx     # 日历视图
│   ├── search/page.tsx       # 全局搜索
│   ├── tags/page.tsx         # 标签管理
│   ├── stats/page.tsx        # 统计看板
│   ├── settings/page.tsx     # 设置
│   └── api/
│       ├── chat/route.ts     # DeepSeek 流式对话
│       ├── notes/route.ts    # 笔记 CRUD
│       ├── expenses/route.ts # 收支 CRUD
│       ├── habits/route.ts   # 习惯 CRUD（含 streaks）
│       ├── export/route.ts   # 导出（MD/JSON/CSV）
│       ├── search/route.ts   # 跨类型搜索
│       ├── tags/route.ts     # 标签管理
│       ├── settings/route.ts # 数据统计 + 清除
│       ├── import/route.ts   # JSON 备份导入
│       └── stats/route.ts    # 聚合统计
├── components/
│   ├── ui/                   # shadcn 组件
│   ├── chat.tsx              # AI 对话组件
│   ├── note-list.tsx         # 笔记/任务列表组件
│   ├── sidebar.tsx           # 导航组件（PC 侧栏 + 手机底栏）
│   ├── export-button.tsx     # 导出按钮
│   ├── theme-provider.tsx    # 主题上下文
│   ├── theme-toggle.tsx      # 深色模式切换
│   ├── pwa-handler.tsx       # 离线横幅 + 安装提示
│   ├── page-animation.tsx    # 页面过渡动效
│   └── skeleton-card.tsx     # 骨架屏
├── lib/
│   ├── db.ts                 # 数据库操作（双模式：SQLite/Turso）
│   ├── types.ts              # TypeScript 类型
│   └── prompts.ts            # AI 系统提示词（6 种输出）
├── store/
│   └── index.ts              # Zustand 状态管理
├── scripts/
│   └── migrate-to-turso.ts   # 本地→Turso 数据迁移
├── data/
│   └── schema.sql            # 数据库完整 DDL
└── public/
    ├── manifest.json          # PWA 配置
    ├── sw.js                  # Service Worker
    └── icons/                 # 应用图标
```

## 如何与 AI 对话

直接在输入框用自然语言描述，AI 会自动理解并记录：

```
"明天下午3点和张三开会讨论项目进度"
→ 创建事件

"吃了午饭，花了35块"
→ 创建支出（分类：餐饮）

"我想每天跑步"
→ 创建习惯

"提醒我今晚8点锻炼"
→ 创建任务 + 截止时间

"最近一周花了多少钱"
→ 查询历史记录并生成总结
```

## 数据同步

默认使用本地 SQLite（`data/life.db`）。如需多端同步：

1. 注册 [Turso](https://turso.tech)
2. 创建数据库：`turso db create life-app`
3. 获取连接信息，填入 `.env.local` 的 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN`
4. 运行 `npm run migrate` 迁移数据

## 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Fork 或推送代码到 GitHub
2. 在 Vercel 导入项目
3. 添加环境变量 `DEEPSEEK_API_KEY` 和 `TURSO_DATABASE_URL`
4. 部署完成

## 本地开发

```bash
npm run dev    # 开发服务器
npm run build  # 生产构建
```
