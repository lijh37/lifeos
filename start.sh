#!/bin/bash
# LifeOS - AI 生活助手 启动脚本
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 获取本机 IP
IP=$(hostname -I | awk '{print $1}')

echo "=========================================="
echo "  LifeOS - AI 生活助手"
echo "=========================================="
echo ""
echo "  PC 端:   http://localhost:3000"
echo "  手机端:   http://${IP}:3000"
echo "  隧道:     https://lifeos.loca.lt (如已启动)"
echo ""
echo "  按 Ctrl+C 停止服务器"
echo "=========================================="
echo ""

# 尝试启动 localtunnel 隧道（后台）
if command -v lt &>/dev/null; then
  lt --port 3000 --subdomain lifeos > /tmp/lifeos-tunnel.log 2>&1 &
  echo "  Tunnel starting: https://lifeos.loca.lt"
fi

npm run dev -- -H 0.0.0.0
