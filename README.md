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

## 桌面快速开始

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

- 产物：`android/app/build/outputs/apk/debug/app-debug.apk`
- 只改 JS/静态资源无需重新 `cap add`，重跑上面三步即可；修改 Capacitor 配置/插件才需重新 sync
- 安装：`adb install -r <apk路径>`（-r 覆盖安装保留数据）

注意事项：
- 手机数据卸载即清除 → 定期「设置 → 导出备份」
- 移动端免登录；`APP_PASSWORD` 不影响移动端
- 真机控制台一条 `favicon.ico 404` 属已知无害噪音

## 桌面部署（Windows 原生）

前置：Windows 10/11 + Node.js LTS（20/22/24 均可）：<https://nodejs.org>；项目拷贝到本地目录（如 `D:\LifeOS\`）。

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

前置：服务器面板（如宝塔）+ Docker；放行端口 8888(面板)、80、443、22；3000 不对公网开放。

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

# 3. 构建 + 启动 + 验证
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
| `COOKIE_SECURE` | `true`（HTTPS 阶段） | cookie Secure 标志 |
| `APP_PASSWORD` | 自定义 | 登录密码 |
| `NEXT_PUBLIC_ICP_BEIAN` | `豫ICP备2026036606号-1` | 备案号页脚（公网域名首页要求） |

> compose 已显式清空 `TURSO_*`，确保走本地 SQLite。环境变量完整说明见 AGENTS.md「环境变量」表（单点源）。

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
4. 登录后刷新跳回登录页 → cookie 被设 `Secure` 但走 HTTP 不传 cookie：确保经 `https://daimoli.xyz` 访问；排查 `.env` 中 `COOKIE_SECURE=true`。验证：`curl -s -i -X POST https://daimoli.xyz/api/auth -H 'Content-Type: application/json' -d '{"password":"你的密码"}' | grep -i set-cookie`（正常应有 `HttpOnly; Secure; SameSite=lax`）
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

## 技术参考

- [AGENTS.md](AGENTS.md)：面向 AI Agent 的完整技术文档（架构 / Schema / API / 环境变量单点源）

**版本**: 1.0.0 | **License**: 私有
