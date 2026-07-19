#!/usr/bin/env bash
# LifeOS 一键部署脚本（主生产 Docker）
# 用法：在服务器项目目录（含 docker-compose.yml）下执行 ./deploy.sh
# 作用：拉取最新代码 → 后台重建镜像 → 镜像就绪后重启容器（迁移脚本在容器启动时自动执行）
#
# 构建在后台进行（nohup + 日志），SSH 断开也不会中断。
# 脚本会阻塞等待构建完成，再继续重启容器；也可另开终端用 `tail -f /tmp/lifeos-build.log` 看进度。
set -euo pipefail

IMAGE="lifeos-next"
BUILD_LOG="/tmp/lifeos-build.log"
BUILD_DONE="/tmp/lifeos-build.done"

# 清理上一次构建标记
rm -f "$BUILD_DONE"

echo "==> [1/4] 拉取最新代码"
git pull --ff-only

echo "==> [2/4] 后台重建镜像（日志: $BUILD_LOG，SSH 断开也不中断）"
# 后台启动构建；构建脚本末尾写 BUILD_DONE 标记
nohup bash -c "
  set -e
  docker build --no-cache -t '$IMAGE' -f Dockerfile . > '$BUILD_LOG' 2>&1
  touch '$BUILD_DONE'
" >/dev/null 2>&1 &

BUILD_PID=$!
echo "    构建进程 PID: $BUILD_PID"

# 等待构建完成（最多 30 分钟）
echo "    等待构建完成..."
TIMEOUT=1800
ELAPSED=0
while [ ! -f "$BUILD_DONE" ]; do
  if ! kill -0 "$BUILD_PID" 2>/dev/null; then
    # 进程已退出但无完成标记 → 构建失败
    echo "!! 构建进程已退出但未成功完成，请查看日志："
    echo "   tail -f $BUILD_LOG"
    exit 1
  fi
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "!! 构建超时（${TIMEOUT}s），请查看日志：tail -f $BUILD_LOG"
    exit 1
  fi
  sleep 10
  ELAPSED=$((ELAPSED + 10))
  # 每 60s 打印一次进度提示
  if [ "$((ELAPSED % 60))" -eq 0 ]; then
    echo "    已等待 ${ELAPSED}s，构建仍在进行…"
  fi
done

echo "    构建完成 ✓"
echo "==> [3/4] 用新镜像重启容器"
docker compose up -d

echo "==> [4/4] 等待启动并查看日志（Ctrl+C 退出日志，容器已在后台运行）"
sleep 3
docker compose logs -f next
