# LifeOS 自托管部署指南（宝塔 + Docker）

适用场景：将 LifeOS 从 Vercel 迁移到阿里云 ECS（宝塔 Linux 面板），重可迁移性。
架构：Docker Compose（next 容器 + nginx 容器），数据持久化到 `lifeos-data` volume。

---

## 0. 前置说明（重要）

- **备案前**：只能用 `http://<服务器公网IP>:3000` 访问（IP + 高位端口，不受 ICP 备案限制）。
- **备案后**：域名解析到服务器，nginx 切到 80/443 + HTTPS。代码与容器无需改动。
- **绝不**在备案通过前把未备案域名解析到本服务器并开 80/443，否则会被阿里云阻断。
- 本方案数据库用本地 SQLite 文件，附件用本地磁盘，完全解耦 Vercel（Turso / Vercel Blob）。

---

## 1. 服务器初始化（一次性）

1. 浏览器打开宝塔面板 `http://<IP>:8888`，完成初始化（设面板密码、安全入口）。
2. 宝塔「软件商店」安装 **Docker**（一键安装，无需装 MySQL / MinIO）。
3. 放行端口（宝塔防火墙 + 阿里云安全组都要放）：
    - `8888` 宝塔面板
    - `3000` 临时 Web 访问
    - `22` SSH
    - 备案后追加 `80`、`443`
4. 安装 git：`yum install -y git`（阿里云 Linux）或 `apt install -y git`。
5. 克隆仓库：`git clone <你的仓库地址> && cd opencode-demo`。
6. **配置 Docker daemon（关键，否则 build 会失败）**：
     阿里云 ECS 默认 `/etc/resolv.conf` 是内网 DNS（`100.100.x.x`），Docker 容器网络命名空间访问不到，
     `docker build` 会出现 `EAI_AGAIN` / `getaddrinfo failed` 报错。同时 Docker Hub 在阿里云网络下
     偶发不可达（`registry-1.docker.io` 连接超时），需给 Docker daemon 同时配**公共 DNS** 和
     **国内镜像加速器**（用于拉取 `node:20-slim` 等基础镜像）：
     ```bash
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
     ```
     `223.5.5.5` 是阿里云公共 DNS，ECS 内网可达，优先用它。重启后容器即可正常解析域名，
     且基础镜像改走国内镜像源，避免 Docker Hub 超时。
     > 若你有阿里云容器镜像服务专属加速器（`https://xxxx.mirror.aliyuncs.com`），把它放在
     > `registry-mirrors` 列表首位更快更稳。

---

## 2. 部署

```bash
cd /root/lifeos

# 复制环境变量模板（注意是 .env.prod.example，不是 .env.example）
cp .env.prod.example .env

# 改密码（用 sed 避免 vi 误粘注释行导致 compose 解析 .env 报错）
sed -i 's/^APP_PASSWORD=demo/APP_PASSWORD=你的新密码/' .env
# 密码不要含 #、空格、$ 等特殊字符（会被 shell 截断）

# 构建镜像（首次约 3-5 分钟；使用 npm ci + node:20-slim）
docker build -t lifeos-next -f Dockerfile .

# 启动容器
docker compose up -d

# 查看日志
docker compose logs -f next
```

> **代码更新后重新部署（重要）**：`git pull` → **必须手动 `docker build -t lifeos-next -f Dockerfile .` 重建镜像** → `docker compose up -d`
> 注意：`docker compose up -d` / `docker compose build` **不会自动重建已存在的本地镜像**（即使代码已更新），
> 必须显式 `docker build` 才能用上新代码，否则容器一直跑旧镜像。

启动后访问 `http://<IP>:3000` 即可使用。迁移脚本会在容器启动时自动执行建表。

### 2.1 一键重新部署

仓库已提供 `deploy.sh`，把上述「拉取 → 重建镜像 → 重启」三步合并，避免漏掉 `docker build`：

```bash
cd /root/lifeos
./deploy.sh          # git pull → 后台 docker build → docker compose up -d → 查看日志
```

脚本会将 `docker build` 放到后台（nohup）运行，**SSH 断开也不会中断构建**；主进程阻塞等待
构建完成标记（最多 30 分钟），完成后自动 `docker compose up -d`。构建日志在 `/tmp/lifeos-build.log`，
可另开终端 `tail -f /tmp/lifeos-build.log` 看实时进度。若构建进程异常退出或超时，脚本会提示查看该日志。
脚本末尾会 `docker compose logs -f next` 跟踪启动日志，`Ctrl+C` 退出即可（容器已在后台运行）。

> **磁盘保护（重要）**：`deploy.sh` 在每次 `docker build` **之前**会先执行 `docker image prune -f`，
> 清掉未被引用的悬空镜像（`<none>`）。因为构建用 `--no-cache`，每次都会生成全新镜像层，
> 若不清理旧镜像会持续堆积、最终把磁盘吃满（曾因此 40G 磁盘被占 28G）。该命令只删悬空镜像，
> 不影响运行中的 `lifeos-next` 容器与 `lifeos-data` 卷，数据安全。
> 此外 `docker-compose.yml` 已为 `next` 服务配置 `logging`（单文件 50M、最多 3 个），
> 防止容器运行日志无限增长。**注意**：`logging` 配置仅对新建容器生效，改 compose 后需
> `docker compose up -d` 重建 `next` 容器才会应用。

---

## 3. 常见问题排查

### 3.1 `docker build` 报 `EAI_AGAIN` / `getaddrinfo failed`
 容器内无法解析域名。原因：阿里云 ECS 默认内网 DNS 容器访问不到。
 解决：按「1.6」给 Docker daemon 配公共 DNS 并 `systemctl restart docker`。
 注：npm 安装阶段若用 `registry.npmmirror.com`，该域名在容器内可能只解析到 IPv6 而不可达；
 Dockerfile 已通过 `ENV NODE_OPTIONS=--dns-result-order=ipv4first` 强制 IPv4 优先规避，无需手动处理。

### 3.2 `docker build` 卡在 `FROM node:20-slim` 报 `i/o timeout` / `DeadlineExceeded`
 拉取基础镜像时连 `registry-1.docker.io` 超时。原因：Docker Hub 在阿里云网络下偶发不可达。
 解决：按「1.6」给 Docker daemon 配 `registry-mirrors` 国内镜像加速器并 `systemctl restart docker`，
 基础镜像即可改走国内源拉取。

### 3.3 `npm ci` 报 `Exit handler never called!`
 npm 在 Node 22/24 的 Docker 构建中存在已知信号处理 bug（npm/cli#7639、#8974），与依赖无关、偶发崩溃。
 本项目已通过将基础镜像降到 `node:20-slim`（`package.json` 的 `engines.node` 同步放宽到 `>=20`）
 彻底规避，无需在容器内升级 npm。若自行改回 Node 22/24 遇到此错，请退回 Node 20。

### 3.2 登录密码正确，但登录后页面刷新又回到登录页
根因：认证 cookie 被设了 `Secure` 标记，而临时访问是 `http://IP:3000`（明文 HTTP）。
浏览器收下 cookie 但拒绝在 HTTP 请求回传 → 中间件读不到 cookie → 重定向回 `/login`。
解决：cookie 的 `Secure` 由 `COOKIE_SECURE` 环境变量控制（见 `app/api/auth/route.ts`）。
`docker-compose.yml` 已设 `COOKIE_SECURE=false`（HTTP 阶段）。**备案切 HTTPS 后必须改为 `true`**。
排查命令（正常 HTTP 阶段应只有 `HttpOnly; SameSite=lax`，没有 `Secure`）：
```bash
curl -s -i -X POST http://127.0.0.1:3000/api/auth \
  -H 'Content-Type: application/json' \
  -d '{"password":"你的密码"}' | grep -i set-cookie
```

---

## 4. 数据备份与迁移（换机器核心）

数据全部在 `lifeos-data` volume（SQLite + 附件）。

**备份：**
```bash
docker compose down
docker run --rm -v lifeos-data:/data -v $PWD:/backup alpine \
  tar czf /backup/lifeos-backup.tar.gz -C /data .
```

**恢复到新机器：**
```bash
docker compose up -d
docker compose down
docker run --rm -v lifeos-data:/data -v $PWD:/backup alpine \
  tar xzf /backup/lifeos-backup.tar.gz -C /data
docker compose up -d
```

> 也可直接用 `app/api/backup` 导出 JSON 备份，在新实例通过「设置 → 恢复」导入。

---

## 5. 备案流程与切换域名 + HTTPS

### 5.1 备案前准备
1. 域名实名认证通过后，**至少等 3 天**信息同步到管局系统，才能发起备案（否则被打回）。
2. 备案期间继续用 `http://<IP>:3000` 访问，**不要解析域名**。
3. 并行准备：阿里云控制台 → 备案 → 申请 **备案服务码**（需关联本台国内 ECS）；
   准备材料（身份证正反面、手机号、应急手机号、邮箱）；确认 ECS 剩余有效期 ≥ 3 个月（不足需先续费）。

### 5.2 提交备案
阿里云控制台 → ICP 备案 → 新增网站（个人）→ 填域名 + 绑定备案服务码 → 上传身份证、人脸核验。
阿里云初审 1-2 工作日 → 管局审核 1-20 工作日（整体 3-22 工作日）。

### 5.3 备案通过后切换
1. 域名 A 记录指向 `<IP>`。
2. 宝塔「网站」添加站点（或「SSL」），申请 Let's Encrypt 免费证书。
3. 修改 `nginx/lifeos.conf`：取消底部 `server { listen 80; ... }` 块注释，填 `server_name your-domain.com;`。
4. 修改 `docker-compose.yml`：放开 `nginx` 的 `80:80` / `443:443` 端口映射（取消注释）。
5. **改 `.env`：`COOKIE_SECURE=true`**（HTTPS 下 cookie 需要 Secure，否则浏览器不回传）。
6. 重新部署：`./deploy.sh`（或 `docker build -t lifeos-next -f Dockerfile . && docker compose up -d`）。
   > 注：构建用 npm ci + node:20-slim，不再依赖 Yarn。
7. 验证 `https://your-domain.com` 可访问。

---

## 6. 回滚到 Vercel 行为

代码默认 `STORAGE_DRIVER=vercel`（即不设置该变量时），Vercel 环境变量不变则行为完全不变。
自托管仅通过 `.env` / compose 注入 `STORAGE_DRIVER=local` 激活本地存储，不影响 Vercel 生产。

---

## 7. 常用运维命令

```bash
docker compose ps            # 查看容器状态
docker compose logs -f next # 看应用日志
docker compose restart       # 重启
docker compose down          # 停止（数据保留在 volume）
npm run migrate              # 手动执行数据库迁移（容器内或本地）
```

### 7.1 重置环境（清空所有数据，重来）

若需丢弃全部数据（SQLite + 附件）从零开始，停容器并删 `lifeos-data` 卷，再清掉所有镜像彻底腾空间：

```bash
docker compose down -v          # 停容器并删除 lifeos-data 卷（数据全清）
docker system prune -a -f       # 删所有未使用镜像/容器/网络/构建缓存
docker system df                # 确认已释放
df -h /                        # 确认磁盘恢复
```

之后重新 `./deploy.sh` 即可拉起一个全新的空 LifeOS（容器启动会自动建空表）。
> `prune -a` 会删掉所有未被容器引用的镜像；若服务器上还有其他项目镜像也会被清掉。
