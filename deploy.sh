#!/usr/bin/env bash
# LifeOS 一键部署脚本（主生产 Docker）
# 用法：在服务器项目目录（含 docker-compose.yml）下执行 ./deploy.sh
# 作用：拉取最新代码 → 重建镜像 → 重启容器（迁移脚本在容器启动时自动执行）
set -euo pipefail

IMAGE="lifeos-next"

echo "==> [1/4] 拉取最新代码"
git pull --ff-only

echo "==> [2/4] 重建镜像（compose up 不会自动重建已存在镜像，必须显式 build；--no-cache 确保构建上下文干净，避免旧 .next 缓存触发离线字体拉取）"
docker build --no-cache -t "$IMAGE" -f Dockerfile .

echo "==> [3/4] 用新镜像重启容器"
docker compose up -d

echo "==> [4/4] 等待启动并查看日志（Ctrl+C 退出日志，容器已在后台运行）"
sleep 3
docker compose logs -f next
