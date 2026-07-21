# LifeOS — 部署指南

> 双生产环境部署与运维。自包含，不依赖 README 或 AGENTS.md。

## 双环境概览

| 角色 | 环境 | 数据库 | 存储 | 入口 |
|------|------|--------|------|------|
| **主生产** | 阿里云 ECS Docker | 本地 SQLite (`lifeos.db`) | 本地磁盘 | `http://<IP>:3000` |
| **备用** | Vercel (hkg1) | Turso 远程 | Vercel Blob | `https://opencode-demo.vercel.app` |

数据完全独立，通过「设置 → 备份/恢复」JSON 手动同步。

## 主生产部署（阿里云 ECS + Docker）

### 前置条件

- 服务器面板（如宝塔）+ Docker（已安装）
- 放行端口：8888(面板), 3000(Web), 22(SSH)；备案后追加 80, 443

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
git clone <你的仓库地址> && cd opencode-demo

# 3. 复制环境变量模板
cp .env.prod.example .env
sed -i 's/^APP_PASSWORD=demo/APP_PASSWORD=你的密码/' .env

# 4. 构建镜像
docker build -t lifeos-next -f Dockerfile .

# 5. 启动容器
docker compose up -d

# 6. 验证
curl http://<IP>:3000
```

启动后迁移脚本在容器入口自动建表（`command: sh -c "mkdir -p /app/data/db && npm run migrate && npm run start"`）。

### 一键重新部署

```bash
cd /root/opencode-demo && ./deploy.sh
```

`deploy.sh` 执行 `git pull` → `docker image prune -f` → 后台 `docker build --no-cache` → `docker compose up -d`。构建日志：`/tmp/lifeos-build.log`。

### 环境变量（`.env`）

| 变量 | 值 | 说明 |
|------|----|------|
| `DATABASE_URL` | `file:./data/db/lifeos.db` | 本地 SQLite |
| `STORAGE_DRIVER` | `local` | 本地磁盘存储 |
| `UPLOAD_DIR` | `/app/data/uploads` | 附件目录 |
| `COOKIE_SECURE` | `false`（HTTP 阶段，HTTPS 后改为 `true`） | cookie Secure 标志 |

### 数据持久化

- Volume: `lifeos-data` → `/app/data`
- SQLite: `/app/data/db/lifeos.db`
- 附件: `/app/data/uploads/`

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

原因：cookie 被设了 `Secure` 标记，HTTP 下浏览器不传 cookie。解决：`.env` 中设 `COOKIE_SECURE=false`。

排查命令：

```bash
curl -s -i -X POST http://127.0.0.1:3000/api/auth \
  -H 'Content-Type: application/json' \
  -d '{"password":"你的密码"}' | grep -i set-cookie
```

正常 HTTP 阶段应有 `HttpOnly; SameSite=lax`，**无** `Secure`。

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

### 备案通过后切换

1. 域名 A 记录指向服务器 IP
2. 服务器面板添加站点，申请 Let's Encrypt 免费证书
3. 修改 `nginx/lifeos.conf`：取消 80/443 server 块注释，填 `server_name your-domain.com;`
4. 修改 `docker-compose.yml`：放开 `nginx` 的 `80:80` / `443:443` 端口映射
5. 改 `.env`：`COOKIE_SECURE=true`
6. 重新部署：`./deploy.sh`
7. 验证 `https://your-domain.com` 可访问

## 备用部署（Vercel）

```bash
git push origin main    # Vercel 自动部署
```

环境变量在 Vercel Dashboard 配置：

| 变量 | 说明 |
|------|------|
| `TURSO_DATABASE_URL` | Turso 远程库地址 |
| `TURSO_AUTH_TOKEN` | Turso 认证 Token |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Token（附件功能） |

`STORAGE_DRIVER` 默认 `vercel`，Vercel 环境无需显式设置。

## 环境切换（主 → 备）

主生产「设置 → 备份」导出 JSON → 备用实例「设置 → 恢复」导入。

## 回滚到 Vercel

代码 `STORAGE_DRIVER` 默认 `vercel`，Vercel 环境变量不变则行为不变。自托管仅通过 `.env` / compose 注入 `STORAGE_DRIVER=local` 切换，不影响 Vercel。

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
