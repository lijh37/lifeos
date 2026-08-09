# LifeOS — 部署指南

> 一套代码，四种运行形态。**手机 APK（主力，完全离线）** 与 **桌面 web（辅助，本机运行）** 为日常形态，无需服务器；**阿里云 ECS Docker** 与 **Vercel** 为备用形态（代码保留、暂未启用），需要浏览器远程访问时再按本指南启用。环境变量完整说明以 AGENTS.md 为单点源。

## 部署形态现状

| 形态 | 状态 | 定位 |
|------|------|------|
| 手机 APK（Capacitor + 原生 SQLite） | **主力，已启用** | 日常使用：随手记、打卡、记账 |
| 桌面 web（Next.js SSR + 本地 SQLite） | **辅助，已启用** | 大屏整理、长文编辑、导出备份 |
| 阿里云 ECS Docker | 暂未启用（代码就绪，域名 daimoli.xyz 已备案） | 浏览器远程访问 / 集中备份 |
| Vercel + Turso | 暂未启用（备用方案） | 与 ECS 数据独立，无实时同步 |

> 各形态数据完全独立，通过「设置 → 备份/恢复」JSON 导出/导入互通（**同一时间只允许一端写库**，不要共享同一个 .db 文件）。

## 移动端（Android APK）—— 主力形态

手机端为**主力形态**：Next 静态导出 + Capacitor 原生 SQLite，**完全离线**（无任何网络依赖，卸载即数据清除）。与服务器/桌面数据相互独立，通过「设置 → 备份/恢复」JSON 手动同步。

### 构建

前置：Node 20.x + Android SDK + JDK 17；`android/local.properties` 含 `sdk.dir`（.gitignore 已忽略，不随仓库分发）。

```bash
npm run build:mobile          # BUILD_TARGET=export 静态导出 → .next-export/
npx cap sync android          # 同步 .next-export/ → android/app/src/main/assets/public
cd android && ./gradlew assembleDebug
```

- 产物：`android/app/build/outputs/apk/debug/app-debug.apk`
- 只改 JS/静态资源无需重新 `cap add`，重跑上面三步即可；修改 Capacitor 配置/插件才需重新 sync
- `capacitor.config.json` 的 `webDir` 为 `.next-export`（与 `next.config.ts` 的 `distDir` 一致）

### 安装

```bash
adb install -r <apk路径>      # -r 覆盖安装保留数据；debug 签名不变则数据保留
```

### 注意事项

- **写库单端**：手机 / 桌面 / 服务器三端各自独立，不要共享同一个 .db 文件（WAL/文件锁风险）；互通只走 JSON 导出/导入
- **备份**：手机数据存 App 私有 SQLite，卸载即清除 → 养成「设置 → 导出备份」定期存档习惯
- **免登录**：原生离线模式登录恒放行（`lib/services/auth.ts` 原生分支恒 `{ok:true}`），`APP_PASSWORD` 不影响移动端
- 真机已知无害噪音：控制台一条 `favicon.ico 404`（Capacitor WebViewLocalServer 不 serve .ico，不影响任何功能）

## 桌面部署（Windows 原生）

本机 Windows 直跑桌面版（web 形态，数据本地 SQLite），与 Docker / 手机端数据相互独立，通过「设置 → 备份/恢复」JSON 手动同步。

### 前置条件

- Windows 10/11（64 位）
- Node.js LTS（Node 20/22/24 均可；本机实测 Node 24 + npm 11 正常）：<https://nodejs.org>
- 将项目拷贝/解压到本地目录，例如 `D:\LifeOS\`

### 首次安装

```bat
cd /d D:\LifeOS
npm install
copy .env.example .env.local
```

编辑 `.env.local`：

| 变量 | 值 | 说明 |
|------|----|------|
| `DATABASE_URL` | `file:./data/lifeos.db` | 本地 SQLite（相对仓库根目录；`.env.example` 已默认此值，一般无需修改） |
| `APP_PASSWORD` | 留空 或 自定义 | 留空=免登录（不推荐）；设置=启用登录 |

> `.env*` 与 `data/` 均已在 .gitignore，不会误提交。

### 日常启动

命令行启动（已构建过直接起，无需每次重构建）：

```bash
npm run start                                # 已构建：直接启动
# 或完整流程（首次 / 升级依赖后）：
npm run migrate && npm run build && npm run start
```

- **Windows 原生**：在 `D:\LifeOS` 下打开 cmd 或 PowerShell 执行上述命令
- **WSL**：在项目目录的 WSL 终端执行同样命令即可（项目位于 WSL 文件系统内时无文件锁问题，见下注意事项）

浏览器访问 <http://localhost:3000>，`Ctrl+C` 停止服务。

### 数据与备份

- 数据库文件：`D:\LifeOS\data\lifeos.db`
- 备份/恢复：应用内「设置 → 备份/恢复」导出/导入 JSON（与服务器端格式一致，可双向迁移）

### 注意事项

- ⚠️ **WSL 文件锁**：若项目放在 WSL 的 `/mnt/c/...`（drvfs 挂载）下，SQLite WAL 写入可能与 Windows 文件锁冲突。建议放 Windows 原生盘（`D:\`），或数据库文件留在 WSL 文件系统内。
- **单端写库**：同一 `.db` 文件同一时间只允许一个实例读写。桌面 / 服务器 / 手机三端数据各自独立，用 JSON 备份手动同步，不要直接共享同一个数据库文件。
- 端口占用：`.env.local` 设 `PORT=3001` 后重启。
- `npm install` 偶发 `Exit handler never called!`（npm 在 Node 22/24 的已知 bug）：升级 npm 重试：`npm i -g npm@latest`。

## 主生产部署（阿里云 ECS + Docker）

> **暂未启用**。需要浏览器远程访问或集中备份时按此启用；本地形态（手机/桌面）无需本节任何步骤。

### 前置条件

- 服务器面板（如宝塔）+ Docker（已安装）
- 放行端口：8888(面板), 80(Web), 443(HTTPS), 22(SSH)；3000 已不对公网开放

### 步骤

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

# 2. 克隆仓库
git clone <你的仓库地址> && cd lifeos

# 3. 复制环境变量模板
cp .env.prod.example .env
sed -i 's/^APP_PASSWORD=demo/APP_PASSWORD=你的密码/' .env

# 4. 构建镜像
docker build -t lifeos-next -f Dockerfile .

# 5. 启动容器
docker compose up -d

# 6. 验证
curl -I https://daimoli.xyz
```

启动后迁移脚本在容器入口自动建表（`command: sh -c "mkdir -p /app/data/db && npm run migrate && npm run start"`）。

### 一键重新部署

```bash
cd /root/lifeos && ./deploy.sh
```

`deploy.sh` 执行 `git pull` → `docker image prune -f` → 后台 `docker build --no-cache` → `docker compose up -d`。构建日志：`/tmp/lifeos-build.log`。

### 环境变量（`.env`）

> 完整变量说明与取值对照见 AGENTS.md「环境变量」表（单点源）；此处仅列部署相关取值。

| 变量 | 值 | 说明 |
|------|----|------|
| `DATABASE_URL` | `file:./data/db/lifeos.db` | 本地 SQLite（容器内路径，对应 volume 的 `/app/data`） |
| `COOKIE_SECURE` | `true`（HTTPS 阶段） | cookie Secure 标志 |
| `APP_PASSWORD` | 自定义 | 登录密码 |
| `NEXT_PUBLIC_ICP_BEIAN` | `豫ICP备2026036606号-1` | 备案号页脚（工信部要求公网域名首页展示） |

> compose 已显式清空 `TURSO_*`，确保 `getClient()` 走本地 SQLite。

### 数据持久化

- Volume: `lifeos-data` → `/app/data`
- SQLite: `/app/data/db/lifeos.db`

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

#### 1. `docker build` 报 `EAI_AGAIN` / `getaddrinfo failed`

原因：阿里云 ECS 默认内网 DNS（`100.100.x.x`）容器网络访问不到。解决：配置 Docker daemon 公共 DNS（见上方步骤 1）。Dockerfile 已通过 `ENV NODE_OPTIONS=--dns-result-order=ipv4first` 强制 IPv4。

#### 2. `docker build` 卡 `FROM node:20-slim` 报 `i/o timeout`

拉取 Docker Hub 基础镜像超时。解决：配置 `registry-mirrors` 国内加速器（见上方步骤 1）。

#### 3. `npm ci` 报 `Exit handler never called!`

npm 在 Node 22/24 的已知 bug（npm/cli#7639, #8974）。项目已通过 `node:20-slim` 规避，**不要改回 Node 22+**。

#### 4. 登录后刷新跳回登录页

原因：cookie 被设了 `Secure` 标记，HTTP 下浏览器不传 cookie。解决：确保经 `https://daimoli.xyz` 访问（`:3000` 已不对公网开放）；排查 `.env` 中 `COOKIE_SECURE=true`。

排查命令：

```bash
curl -s -i -X POST https://daimoli.xyz/api/auth \
  -H 'Content-Type: application/json' \
  -d '{"password":"你的密码"}' | grep -i set-cookie
```

HTTPS 阶段正常应有 `HttpOnly; Secure; SameSite=lax`。

#### 5. nginx 反代报 `502 Bad Gateway`

原因：`lifeos.conf` 中 `proxy_pass http://next:3000;` 的 `next` 是 Docker 容器名。确保 `docker-compose.yml` 的 service 名匹配。

## 备案流程（如需绑定域名）

### 备案前准备

1. 域名实名认证通过后，**至少等 3 天**信息同步到管局系统
2. 备案期间继续用 `http://<IP>:3000`，**不要解析域名**
3. 阿里云控制台申请备案服务码，准备身份证、手机号材料
4. 确认 ECS 剩余有效期 ≥ 3 个月

### 提交流程

阿里云控制台 → ICP 备案 → 新增网站 → 填域名 + 绑定备案服务码 → 上传身份证、人脸核验

周期：初审 1-2 工作日 + 管局审核 1-20 工作日

### 备案通过后切换（已完成：域名 daimoli.xyz）

1. **DNS**：域名 A 记录指向服务器公网 IP，等解析生效
2. **安全组**：放行入方向 80、443
3. **申请证书**（宝塔或 certbot，二选一）：
   - certbot：`certbot certonly --standalone -d daimoli.xyz`（申请时先 `docker compose stop nginx`，申请完再启动），或 webroot 方式
   - 宝塔：面板申请 Let's Encrypt 证书
   - 将证书复制到仓库根目录 `./certs/`：
     ```bash
     mkdir -p certs
     cp /etc/letsencrypt/live/daimoli.xyz/fullchain.pem certs/
     cp /etc/letsencrypt/live/daimoli.xyz/privkey.pem certs/
     chmod 600 certs/privkey.pem
     ```
4. **仓库配置已就绪**：`nginx/lifeos.conf` 已切 80→443 跳转 + HTTPS（`server_name daimoli.xyz`）；`docker-compose.yml` 已放开 80/443 并挂载 `./certs` 目录
5. **改 `.env`**：`COOKIE_SECURE=true`
6. **重新部署**：`./deploy.sh`
7. **验证**：`curl -I https://daimoli.xyz` 返回 200；`curl -I http://daimoli.xyz` 返回 301

> ⚠️ 注意：宝塔面板的 Let's Encrypt 只自动配置**宿主** nginx，不会配置 Docker 容器内的 nginx。
> 必须手动把证书复制到 `./certs/` 并重启 nginx 容器，否则 443 不会生效。

### 证书续期

Let's Encrypt 证书 90 天有效，续期后需让容器内 nginx 重新加载证书：

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

## 备用部署（Vercel）

> **暂未启用**（备用方案，与 ECS 数据独立）。

```bash
git push origin main    # Vercel 自动部署
```

**必须配置** Turso 远程库（`vercel.json` 的构建命令会在构建期执行 `scripts/migrate.ts` 建表，未配置 Turso 构建将失败）：

| 变量 | 说明 |
|------|------|
| `TURSO_DATABASE_URL` | Turso 远程库地址（必需） |
| `TURSO_AUTH_TOKEN` | Turso 认证 Token（必需） |

其余变量（`APP_PASSWORD`/`COOKIE_SECURE` 等）按需在 Vercel Dashboard 配置，完整说明见 AGENTS.md「环境变量」表（单点源）。

## 环境切换（主 → 备）

主生产「设置 → 备份」导出 JSON → 备用实例「设置 → 恢复」导入。

## 常用运维命令

```bash
docker compose ps                      # 查看容器状态
docker compose logs -f next            # 看应用日志
docker compose restart                  # 重启
docker compose down                     # 停止（数据保留在 volume）
npm run migrate                         # 手动执行迁移（容器内或本地）
```

### 重置环境（清空全部数据）

```bash
docker compose down -v                 # 停容器 + 删 lifeos-data 卷
docker system prune -a -f              # 清镜像/容器/构建缓存
df -h /                                # 确认磁盘恢复
```

之后重新 `./deploy.sh` 拉起全新实例。
