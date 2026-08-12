# LifeOS — 个人生活助手

个人生活助手：笔记管理、预算规划、习惯养成、体重记录。四种运行方式：**手机 APK（完全离线）**、**桌面 web（本地运行）**、**Docker（服务器）**、**Vercel + Turso（远程）**，各端数据经 JSON 备份互通。

## 运行形态

| 形态 | 定位 | 数据 | 启动方式 |
|------|------|------|----------|
| **Android APK** | 手机端，随手记录/打卡，完全离线 | 手机内置 SQLite | 构建见下 |
| 桌面 web | 电脑端，大屏整理/长文编辑 | 本地 `data/lifeos.db` | `npm run start` |
| Docker | 服务器端，浏览器远程访问/集中备份 | Docker volume（`lifeos-data`） | 见下文 Docker 章节 |
| Vercel + Turso | 服务器端，远程访问 | Turso 远程库 | 见下文 Vercel 章节 |

各端数据独立存储，通过「设置 → 备份/恢复」JSON 导出/导入互通（**同一时间只允许一端写库**）。

## 架构一览

单体应用：Next.js 16 App Router（SSR + API Routes 同仓），数据层按运行环境自动切换适配器，无外部服务依赖。

```
┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐
│  Android APK │  │    桌面 web   │  │ Docker 服务器  │  │  Vercel + Turso  │
│  原生 SQLite  │  │  本地 SQLite  │  │ volume SQLite  │  │  Turso 远程库    │
└──────┬───────┘  └──────┬───────┘  └───────┬───────┘  └────────┬─────────┘
       │                 │                  │                   │
       └───「设置 → 备份/恢复」JSON 导出/导入互通（同一时间只允许一端写库）───┘
```

- **数据层**：客户端统一经 `lib/services/` 访问——Capacitor 原生直查本地 SQLite；web/桌面走同仓 API 透传。底层双适配器：`@libsql/client`（本地/远程 Turso）与 `@capacitor-community/sqlite`（移动端）
- **认证**：无状态 HMAC（`app_auth` cookie，30 天）。`APP_PASSWORD` 留空则免登录；手机端原生离线恒免登录
- **数据库**：8 张表，终态幂等迁移自愈（`lib/db/migrations.ts` 唯一真相），无版本簿记，启动自动建表
- **互通**：各端数据独立存储，经 JSON 备份导出/导入迁移，不直接拷贝 .db 文件

## 桌面快速开始

前置：Node >= 20（推荐 20 LTS，理由见下「注意事项」）。

```bash
git clone <repo> && cd lifeos
npm install
cp .env.example .env.local    # DATABASE_URL=file:./data/lifeos.db 已默认
npm run dev                   # 开发模式，http://localhost:3000
# 或生产模式：npm run build && npm run start
```

- `.env.local` **不得**设置 `TURSO_DATABASE_URL`，否则 dev 护栏拒绝连接
- 完整部署（APK / Windows / Docker / Vercel）见下文对应章节

## 移动端（Android APK）

Next 静态导出 + Capacitor 原生 SQLite，卸载即数据清除。

前置：Node 20.x + Android SDK + JDK 17；`android/local.properties` 含 `sdk.dir`（不随仓库分发）。

```bash
npm run build:mobile          # BUILD_TARGET=export 静态导出 → .next-export/
npx cap sync android          # 同步 .next-export/ → android/app/src/main/assets/public
cd android && ./gradlew assembleDebug
```

或一条命令完成以上三步：

```bash
npm run deploy:mobile         # 一键构建：build:mobile → cap sync → gradlew assembleDebug
```

- 产物：`android/app/build/outputs/apk/debug/app-debug.apk`
- 只改 JS/静态资源无需重新 `cap add`，重跑上面三步即可；修改 Capacitor 配置/插件才需重新 sync
- 安装：`adb install -r <apk路径>`（-r 覆盖安装保留数据）

注意事项：
- 手机数据卸载即清除 → 定期「设置 → 导出备份」
- 移动端免登录；`APP_PASSWORD` 不影响移动端
- 真机控制台一条 `favicon.ico 404` 属已知无害噪音

## 桌面部署（Windows 原生）

前置：Windows 10/11 + Node.js 20 LTS（推荐；22/24 可用，但 `npm install` 有已知 bug，见下「注意事项」）：<https://nodejs.org>；项目拷贝到本地目录（如 `D:\LifeOS\`）。

```bat
cd /d D:\LifeOS
npm install
copy .env.example .env.local
```

编辑 `.env.local`：

| 变量 | 值 | 说明 |
|------|----|------|
| `DATABASE_URL` | `file:./data/lifeos.db` | 本地 SQLite（`.env.example` 已默认，一般无需改） |
| `APP_PASSWORD` | 留空 或 自定义 | 留空=免登录；设置=启用登录 |

启动：

```bash
npm run start                                # 已构建：直接启动
# 或完整流程（首次 / 升级依赖后）：
npm run migrate && npm run build && npm run start
```

浏览器访问 <http://localhost:3000>。`.env*` 与 `data/` 已在 .gitignore。

注意事项：
- **WSL 文件锁**：项目放 `/mnt/c/...`（drvfs 挂载）下 SQLite WAL 写入可能与 Windows 文件锁冲突 → 放 Windows 原生盘（`D:\`），或数据库文件留在 WSL 文件系统内
- **单端写库**：同一 `.db` 同一时间只允许一个实例读写
- 端口占用：`.env.local` 设 `PORT=3001` 后重启
- `npm install` 偶发 `Exit handler never called!`（Node 22/24 npm bug）：`npm i -g npm@latest` 重试

## 阿里云 ECS + Docker

本地使用（手机/桌面）无需本节。

### 首次部署

前置：服务器面板（如宝塔）+ Docker；放行端口 8888(面板)、80、443、22；如需 `http://IP:3000` 直连入口，另放行 3000（可选）。

```bash
# 1. 配置 Docker daemon（解决 EAI_AGAIN / i/o timeout）
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "dns": ["223.5.5.5", "8.8.8.8", "114.114.114.114"],
  "registry-mirrors": [
    "https://hub-mirror.c.163.com",
    "https://docker.m.daocloud.io",
    "https://registry.docker-cn.com"
  ]
}
EOF
systemctl restart docker

# 2. 克隆 + 环境变量
git clone <你的仓库地址> && cd lifeos
cp .env.prod.example .env
sed -i 's/^APP_PASSWORD=demo/APP_PASSWORD=你的密码/' .env

# 3. TLS 证书（HTTPS 必需，否则步骤 4 的 curl 验证会失败）
mkdir -p certs
#   用 certbot 或宝塔面板申请证书，将 fullchain.pem / privkey.pem 放入 ./certs/
#   （docker-compose.yml 已把 ./certs 挂载到容器 /etc/nginx/certs，lifeos.conf 引用该路径）
ls certs/                     # 确认 fullchain.pem privkey.pem 已就位

# 4. 构建 + 启动 + 验证
docker build -t lifeos-next -f Dockerfile .
docker compose up -d
curl -I https://daimoli.xyz
```

迁移脚本在容器入口自动建表（`command: sh -c "mkdir -p /app/data/db && npm run migrate && npm run start"`）。

### 一键重新部署

```bash
cd /root/lifeos && ./deploy.sh     # git pull → docker build（层缓存）→ compose up -d → 清理
```

构建日志：`/tmp/lifeos-build.log`。

### 环境变量（`.env`）

| 变量 | 值 | 说明 |
|------|----|------|
| `DATABASE_URL` | `file:./data/db/lifeos.db` | 容器内路径，对应 volume 的 `/app/data` |
| `COOKIE_SECURE` | `false`（默认，双入口） | cookie Secure 标志；`http://IP:3000` 直连必须为 false |
| `APP_PASSWORD` | 自定义 | 登录密码 |
| `NEXT_PUBLIC_ICP_BEIAN` | `豫ICP备2026036606号-1` | 备案号页脚（公网域名首页要求） |

> compose 已显式清空 `TURSO_*`，确保走本地 SQLite。环境变量完整说明见 AGENTS.md「环境变量」表（单点源）。

### 双入口访问

`docker compose up -d` 后两种方式均可访问同一份数据：

| 入口 | URL | 说明 |
|------|-----|------|
| 域名 HTTPS | `https://daimoli.xyz` | nginx 反代（80/443 → next:3000），正式入口 |
| IP 直连 | `http://<公网IP>:3000` | next 容器直接映射，需安全组放行 3000；HTTP 明文，仅个人自用 |

> 两入口 cookie 独立（host-only），各自登录互不影响，共享同一 SQLite volume。`COOKIE_SECURE` 必须为 `false` 才能支持 IP 直连登录。

### 数据持久化

Volume `lifeos-data` → `/app/data`，SQLite 在 `/app/data/db/lifeos.db`。

备份 volume：

```bash
docker compose down
docker run --rm -v lifeos-data:/data -v $PWD:/backup alpine \
  tar czf /backup/lifeos-backup.tar.gz -C /data .
```

恢复到新机器：

```bash
docker compose up -d && docker compose down
docker run --rm -v lifeos-data:/data -v $PWD:/backup alpine \
  tar xzf /backup/lifeos-backup.tar.gz -C /data
docker compose up -d
```

也可通过「设置 → 备份/恢复」JSON 导入导出。

### 常见问题

1. `docker build` 报 `EAI_AGAIN` / `getaddrinfo failed` → 配置 Docker daemon 公共 DNS（见首次部署步骤 1）；Dockerfile 已 `ENV NODE_OPTIONS=--dns-result-order=ipv4first`
2. `docker build` 卡 `FROM node:20-slim` 报 `i/o timeout` → 配置 `registry-mirrors` 国内加速器（见步骤 1）
3. `npm ci` 报 `Exit handler never called!` → npm 在 Node 22/24 的已知 bug，项目已用 `node:20-slim` 规避，**不要改回 Node 22+**
4. 登录后刷新跳回登录页 → cookie 被设 `Secure` 但走 HTTP 不传 cookie：`http://IP:3000` 入口要求 `.env` 中 `COOKIE_SECURE=false`（默认）；经 `https://daimoli.xyz` 访问时可为 true。验证：`curl -s -i -X POST http://IP:3000/api/auth -H 'Content-Type: application/json' -d '{"password":"你的密码"}' | grep -i set-cookie`（false 模式下应无 `Secure` 标志，仅 `HttpOnly; SameSite=lax`）
5. nginx 反代报 `502 Bad Gateway` → `lifeos.conf` 中 `proxy_pass http://next:3000;` 的 `next` 是容器名，确保 `docker-compose.yml` 的 service 名匹配

## 证书续期

Let's Encrypt 证书 90 天有效，续期后需让容器内 nginx 重新加载：

```bash
certbot renew
docker compose restart nginx    # 或 docker exec lifeos-nginx nginx -s reload
```

建议 crontab 每月自动续期：

```bash
crontab -e
# 每月 1 日 03:15
15 3 1 * * cd /root/lifeos && certbot renew --quiet && docker compose restart nginx
```

## Vercel

```bash
git push origin main    # Vercel 自动部署
```

**必须配置** Turso 远程库（`vercel.json` 构建期执行 `scripts/migrate.ts` 建表，未配置构建将失败）：

| 变量 | 说明 |
|------|------|
| `TURSO_DATABASE_URL` | Turso 远程库地址（必需） |
| `TURSO_AUTH_TOKEN` | Turso 认证 Token（必需） |

其余变量（`APP_PASSWORD`/`COOKIE_SECURE`）按需配置，完整说明见 AGENTS.md「环境变量」。

## 环境切换

任一端「设置 → 备份」导出 JSON → 另一端「设置 → 恢复」导入。

## 常用运维命令

```bash
docker compose ps                      # 查看容器状态
docker compose logs -f next            # 看应用日志
docker compose restart                 # 重启
docker compose down                    # 停止（数据保留在 volume）
npm run migrate                        # 手动执行迁移（容器内或本地）
```

重置环境（清空全部数据）：

```bash
docker compose down -v                 # 停容器 + 删 lifeos-data 卷
docker system prune -a -f              # 清镜像/容器/构建缓存
df -h /                                # 确认磁盘恢复
```

之后重新 `./deploy.sh` 拉起全新实例。

## 本地故障排查（桌面/开发）

1. 端口被占用 → `.env.local` 设 `PORT=3001` 后重启
2. 启动报「dev 护栏拒绝连接」→ `.env.local` 误设了 `TURSO_DATABASE_URL`（本地开发禁止设置，完整说明见 AGENTS.md「环境变量」表）
3. SQLite 报 `database is locked` / 写入失败 → 同一 .db 被多个实例同时写：关闭其他运行中的实例（桌面/服务器）
4. WSL 下项目放 `/mnt/c/...` 写入报错 → 文件锁冲突：放 Windows 原生盘，或数据库文件留在 WSL 文件系统内（见「桌面部署」）
5. `npm install` 偶发 `Exit handler never called!` → `npm i -g npm@latest` 重试（见「桌面部署」）
6. 访问到旧版页面内容 → 强刷（Ctrl+Shift+R）一次：PWA 残留清理脚本会在加载时自动注销 Service Worker 并清缓存，属一次性自愈
7. 本地登录后刷新跳回登录页 → `.env.local` 里 `COOKIE_SECURE` 必须留空（设为 `true` 时 cookie 带 Secure 标志，HTTP 下浏览器不传）

## 开发与贡献

```bash
npm install
npm run dev          # 开发模式（自动建表，--webpack 编译）
npm test             # 单元测试（vitest，约 148 个）
npm run test:e2e     # Playwright E2E（自动起 dev server + 自动清理测试库）
npm run lint         # ESLint
```

文档纪律（`AGENTS.md` 是唯一技术真相，README 只讲使用与部署）：

- 改 API 契约 / 环境变量 / Schema → 同步 `AGENTS.md` 对应章节
- 新增环境变量 → 同步 `AGENTS.md` 环境变量表 + `.env.example` / `.env.prod.example`
- 增删文件/测试 → 重跑 `npm run docs:gen`（自动重写目录树与测试清单区块）
- 升级依赖 → 核对 `README.md` 中出现的版本号
- 提交前验证：`npm run docs:check`，且 `npm run docs:gen` 后 `git diff --exit-code -- AGENTS.md` 无输出（CI 同样强制）

## 技术参考

- [AGENTS.md](AGENTS.md)：面向 AI Agent 的完整技术文档（架构 / Schema / API / 环境变量单点源）

**版本**: 1.0.0 | **License**: 私有
