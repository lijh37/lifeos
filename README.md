# LifeOS — 个人生活助手

个人生活助手：笔记管理、预算规划、习惯养成、体重记录。**手机 APK 完全离线（主力） + 电脑桌面 web（辅助）**，数据经 JSON 备份互通。

## 运行形态

| 形态 | 定位 | 数据 | 启动方式 |
|------|------|------|----------|
| **Android APK** | 主力——日常随手记录/打卡 | 手机内置 SQLite，**完全离线** | 直接安装（构建步骤见下） |
| 桌面 web | 辅助——偶尔用电脑整理 | 本地 `data/lifeos.db` | 双击 `启动.bat`（Windows）/ `npm run start` |
| 服务器 | 远程访问/备份 | SQLite / Turso | 见 [DEPLOY.md](DEPLOY.md) |

三端数据独立存储，通过「设置 → 备份/恢复」JSON 导出/导入互通（**同一时间只允许一端写库**）。

## 功能概览

| 功能 | 路由 | 说明 |
|------|------|------|
| 笔记 | `/notes` | Markdown 编辑、标签分类、搜索、置顶、批量操作 |
| 预算 | `/expenses` | 月度预算设置、实际支出对比、结算 |
| 习惯 | `/habits` | 每日/每周打卡、连续天数、趋势统计 |
| 体重 | `/weight` | 体重记录与趋势（本人/家人两人） |
| 设置 | `/settings` | JSON 备份导出/恢复、登录密码 |

## 最佳使用方案（手机为主，电脑偶尔）

### 日常：手机 APK

- **完全离线**，无需联网，打开即用；无网络也不影响任何功能
- 笔记随手记、习惯打卡、体重记录，全部在手机上完成
- 手机端为原生离线模式，自动跳过登录

### 偶尔：电脑

- 适合长文编辑、批量整理、导出 Markdown 阅读
- Windows 双击仓库根目录 `启动.bat` 即可运行（首次自动安装依赖+建表+构建+启动）
- 浏览器访问 <http://localhost:3000>，关闭窗口即停止

### 数据同步（重要规则）

三端数据各自独立，**不要直接拷贝/共享数据库文件**。同步唯一方式：

```
导出备份 JSON（一端） → 导入恢复（另一端）
```

⚠️ **导入恢复会清空目标端现有数据并整体替换**，操作前务必先导出一份当前数据。

推荐节奏：

1. **以手机为数据主源**。定期（建议每周或每月）在手机「设置 → 导出备份」，备份文件存手机或网盘归档
2. 想在电脑上看/整理：手机「导出备份」→ 电脑「导入恢复」（电脑旧数据被覆盖，以手机为准，符合预期）
3. 电脑上也写过新数据：先在电脑「导出备份」另存一份 → 再导入手机最新备份 → 把电脑端新增内容人工并入手机 → 此后以合并后的手机数据为主源
4. **换机**：旧手机导出 JSON → 新手机装 APK → 导入 → 全部数据迁移完成

> 移动端数据存于 App 私有目录，**卸载 App 即清除**，务必养成定期导出的习惯。

## 手机安装（构建 APK）

前置：Node 20.x + Android SDK（`android/local.properties` 配置 `sdk.dir`）。

```bash
npm run build:mobile          # ① 静态导出（BUILD_TARGET=export → out/）
npx cap sync android          # ② 同步到 Android 工程
cd android && ./gradlew assembleDebug   # ③ 构建 debug APK
```

- 产物：`android/app/build/outputs/apk/debug/app-debug.apk`
- 安装（覆盖安装保留数据）：

```bash
adb install -r app-debug.apk
```

## 桌面快速开始

```bash
git clone <repo> && cd lifeos
npm install
cp .env.example .env.local    # 编辑 DATABASE_URL=file:./data/dev.db
npm run dev                   # 开发模式，http://localhost:3000
# 或生产模式：npm run build && npm run start
```

Windows 原生运行（Node 22/24 亦可）见 [DEPLOY.md → 桌面部署](DEPLOY.md)。

> `.env.local` **不得**设置 `TURSO_DATABASE_URL`，否则 dev 护栏拒绝连接。

## 数据与备份

- 手机：App 私有 SQLite（**卸载清除**）
- 电脑：`data/lifeos.db`
- 服务器：Docker volume（`lifeos-data`）
- 备份文件：`lifeos-backup-YYYY-MM-DD.json`（含全部笔记/预算/习惯/体重）

## 文档索引

- [技术参考 → AGENTS.md](AGENTS.md)（面向 AI Agent 的完整项目技术文档）
- [部署指南 → DEPLOY.md](DEPLOY.md)（服务器 / 桌面 / 移动端构建与运维）

## 技术栈

**Next.js 16.2.9 (App Router)** + **React 19.2.4** + **TypeScript ^5** + **Tailwind v4** + **@base-ui/react ^1.6.0** + **`@libsql/client` ^0.17.4** (SQLite/Turso) + **Zustand ^5.0.14** + **date-fns ^4.4.0** + **lucide-react ^1.21.0** + **react-markdown ^10.1.0** + **Capacitor ^8.5.0** + **`@capacitor-community/sqlite` ^8.1.1**（移动端离线存储）

## 项目状态

**版本**: 0.2.1 | **Node**: 20.x（勿用 22+：npm "Exit handler never called" bug，见 DEPLOY.md FAQ） | **License**: 私有
