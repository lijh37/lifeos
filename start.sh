#!/bin/bash
# LifeOS - AI 生活助手 启动脚本
# 用法: bash start.sh [LAN-IP]
#   不传参数时自动检测（WSL2 内部 IP）
#   传参时用指定 IP 显示（Windows 转发场景: bash start.sh 192.168.31.111）
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

LAN_IP="${1:-$(ip route get 1 2>/dev/null | awk '{print $7}' || hostname -I | awk '{print $1}')}"
PROTO="http"
DEV_CMD="dev"
MODE_LABEL="HTTP"

if [ -f ./certs/dev-key.pem ] && [ -f ./certs/dev-cert.pem ]; then
  PROTO="https"
  DEV_CMD="dev:https"
  MODE_LABEL="HTTPS (PWA 可用)"
fi

# 清理旧 Next.js 进程（ss 比 lsof 更可靠）
CLEAN_PIDS=$(ss -tlnp 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)
if [ -n "$CLEAN_PIDS" ]; then
  echo "🧹 清理残留的 Next.js 进程..."
  echo "$CLEAN_PIDS" | xargs kill -9 2>/dev/null
  sleep 1
fi

echo "=========================================="
echo "  LifeOS - AI 生活助手"
echo "  Mode: $MODE_LABEL"
echo "=========================================="
echo ""
echo "  PC:   ${PROTO}://localhost:3000"

if [ "$PROTO" = "https" ]; then
  echo "  📱:   ${PROTO}://${LAN_IP}:3000 (PWA 可安装)"
  echo ""
  echo "  手机安装 PWA:"
  echo "    浏览器打开 https://${LAN_IP}:3000"
  echo "    点击几次 → 弹窗「安装」→ 确认"
else
  echo "  手机: http://${LAN_IP}:3000 (仅浏览，无 PWA)"
  echo ""
  echo "  🔒 启用 PWA 安装:"
  echo "     bash scripts/https-setup.sh"
  echo "     然后重新启动: bash start.sh"
fi

echo ""
echo "  诊断: 右上角 Bug 图标 / ?debug=1"
echo "  CA 下载: ${PROTO}://${LAN_IP}:3000/ca.pem (手机装一次即可)"
echo "  停止:  Ctrl+C"
echo "=========================================="
echo ""

LAN_IP="$LAN_IP" npm run "$DEV_CMD"
