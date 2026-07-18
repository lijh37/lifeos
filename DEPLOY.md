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
6. **配置 Docker DNS（关键，否则 build 会 DNS 解析失败）**：
   阿里云 ECS 默认 `/etc/resolv.conf` 是内网 DNS（`100.100.x.x`），Docker 容器网络命名空间访问不到，
   `docker build` 会出现 `EAI_AGAIN` / `getaddrinfo failed` 报错。需给 Docker daemon 配公共 DNS：
   ```bash
   mkdir -p /etc/docker
   cat > /etc/docker/daemon.json <<'EOF'
   {
     "dns": ["223.5.5.5", "8.8.8.8", "114.114.114.114"]
   }
   EOF
   systemctl restart docker
   ```
   `223.5.5.5` 是阿里云公共 DNS，ECS 内网可达，优先用它。重启后容器即可正常解析域名。

---

## 2. 部署

```bash
# 复制环境变量模板
cp .env.prod.example .env
# 按需修改 .env（如改 APP_PASSWORD）

# 构建镜像（首次约 3-5 分钟，使用 Yarn 规避 Docker 26.1 下 npm 信号处理 bug）
docker build -t lifeos-next -f Dockerfile .

# 启动容器（使用上面构建好的 lifeos-next 镜像）
docker compose up -d

# 查看日志
docker compose logs -f next
```

> **代码更新后重新部署**：`git pull` → `docker build -t lifeos-next -f Dockerfile .` → `docker compose up -d`

启动后访问 `http://<IP>:3000` 即可使用。迁移脚本会在容器启动时自动执行建表。

---

## 3. 数据备份与迁移（换机器核心）

数据全部在 `lifeos-data` volume（SQLite + 附件）。

**备份：**
```bash
docker compose down
# 导出 volume 为 tar（含 db + uploads）
docker run --rm -v lifeos-data:/data -v $PWD:/backup alpine \
  tar czf /backup/lifeos-backup.tar.gz -C /data .
```

**恢复到新机器：**
```bash
# 新机器：clone 仓库、docker compose up -d 创建 volume 后停掉
docker compose up -d
docker compose down
# 解压备份进 volume
docker run --rm -v lifeos-data:/data -v $PWD:/backup alpine \
  tar xzf /backup/lifeos-backup.tar.gz -C /data
docker compose up -d
```

> 也可直接用 `app/api/backup` 导出 JSON 备份，在新实例通过「设置 → 恢复」导入。

---

## 4. 备案通过后切换域名 + HTTPS

1. 域名在阿里云完成 ICP 备案。
2. 域名解析 A 记录指向 `<IP>`。
3. 宝塔「网站」添加站点（或「SSL」），申请 Let's Encrypt 免费证书。
4. 修改 `nginx/lifeos.conf`：取消底部 `server { listen 80; ... }` 块注释，填 `server_name your-domain.com;`。
5. 修改 `docker-compose.yml`：放开 `nginx` 的 `80:80` / `443:443` 端口映射（取消注释）。
6. 重新部署：`docker compose up -d nginx`。
7. 验证 `https://your-domain.com` 可访问。

---

## 5. 回滚到 Vercel 行为

代码默认 `STORAGE_DRIVER=vercel`（即不设置该变量时），Vercel 环境变量不变则行为完全不变。
自托管仅通过 `.env` / compose 注入 `STORAGE_DRIVER=local` 激活本地存储，不影响 Vercel 生产。

---

## 6. 常用运维命令

```bash
docker compose ps            # 查看容器状态
docker compose logs -f next  # 看应用日志
docker compose restart       # 重启
docker compose down          # 停止（数据保留在 volume）
npm run migrate              # 手动执行数据库迁移（容器内或本地）
```
