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

### 4. 手机端访问（PWA）

#### 方式一：局域网 HTTPS（推荐，一劳永逸）

```bash
# 首次：安装 HTTPS 开发证书（仅一次）
bash scripts/https-setup.sh

# 以后每次：直接启动
bash start.sh
```

- PC 访问 `https://localhost:3000`
- **手机首次**需安装 CA 证书，按终端输出的指引操作（Android 下载 `.pem` → 设置 → 安装 CA 证书）
- 之后手机直接打开 `https://<LAN-IP>:3000`，同局域网内随时可用，每次地址不变
- PWA 完整支持：安装提示、离线缓存、通知

#### 方式二：HTTPS 隧道（备用，无局域网时）

```bash
bash scripts/tunnel.sh
# 自动使用 cloudflared → ngrok → localtunnel
```

手机打开输出的随机 `https://xxx.trycloudflare.com`，PWA 可安装。每次重启地址会变。

#### 方式三：HTTP（仅浏览，不可 PWA）

WSL2 用户需先在 Windows 管理员 PowerShell 运行 `.\setup-wsl.ps1`，然后手机访问 `http://[Windows主机IP]:3000`。

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
- [x] 通知提醒 — 到期任务/事件浏览器推送 + 内联提醒卡片
- [x] 多端自适应 — PC 侧栏导航 + 手机底部 Tab

### 规划中
- [ ] 多端同步 — Turso 云端同步 + Vercel 部署
- [ ] 饮食+锻炼追踪 — 拍照识食物，运动记录
- [ ] 富文本编辑

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
│   ├── fab-button.tsx        # 悬浮快捷按钮
│   ├── export-button.tsx     # 导出按钮
│   ├── theme-provider.tsx    # 主题上下文
│   ├── theme-toggle.tsx      # 深色模式切换
│   ├── pwa-handler.tsx       # PWA 安装管理 + 诊断面板
│   ├── notification-manager.tsx # 通知提醒管理器
│   ├── page-animation.tsx    # 页面过渡动效
│   └── skeleton-card.tsx     # 骨架屏
├── lib/
│   ├── db.ts                 # 数据库操作（双模式：SQLite/Turso）
│   ├── types.ts              # TypeScript 类型
│   └── prompts.ts            # AI 系统提示词（6 种输出）
├── store/
│   └── index.ts              # Zustand 状态管理
├── scripts/
│   ├── https-setup.sh       # HTTPS 开发证书一键生成
│   ├── migrate-to-turso.ts  # 本地→Turso 数据迁移
│   └── tunnel.sh            # HTTPS 隧道（cloudflared/ngrok/localtunnel）
├── data/
│   └── schema.sql            # 数据库完整 DDL
└── public/
    ├── manifest.json          # PWA 配置
    ├── sw.js                  # Service Worker
    └── icons/                 # 应用图标
```

## PWA 移动端安装

LifeOS 支持以 PWA 方式安装到手机桌面，像原生 App 一样运行。

### PWA 架构

```
public/sw.js              # Service Worker（最简，仅满足浏览器检测）
public/manifest.json      # 应用清单（PNG 图标 + standalone 模式）
public/icons/icon-{192,512}.png  # 应用图标
components/pwa-handler.tsx # 安装管理 + 诊断面板（右上角 Bug 图标 / ?debug=1）
```

### 必要条件

| 条件 | 说明 |
|---|---|
| HTTPS | PWA 必须在 HTTPS 下运行（localhost 除外）|
| 用户交互 | 需在页面上点击/滚动后才能触发安装提示 |
| Service Worker | `/sw.js` 必须正确注册并返回 200 |

### 开发期测试

#### 方式一：局域网 HTTPS（推荐）

```bash
# 首次：生成开发证书
bash scripts/https-setup.sh

# 启动（自动检测证书，启用 HTTPS）
bash start.sh

# 或直接
npm run dev:https
```

手机打开 `https://<LAN-IP>:3000`（地址不变），点「安装」。诊断面板：右上角 Bug 图标 / `?debug=1`。

```
SW: ✅ 已注册
beforeinstallprompt: ✅ 已触发
manifest: ✅ 200 ...
```

#### 方式二：HTTPS 隧道（无局域网时）

```bash
npm run dev

# 新终端
bash scripts/tunnel.sh
```

手机打开随机的 `https://xxx.trycloudflare.com` 安装 PWA。每次重启地址会变。

### 生产部署（Vercel）

部署到 Vercel 后自动获得 HTTPS，无需隧道，直接安装。

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
