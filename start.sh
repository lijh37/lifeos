#!/bin/bash
# LifeOS - AI 生活助手 一键启动脚本
# 用法: bash start.sh [--tunnel] [--http] [LAN-IP]
#   --tunnel   启动 HTTPS 隧道（异地手机用 cloudflare 访问）
#   --http     强制 HTTP 模式（隧道模式自动开启，无需手动）
#   LAN-IP     指定局域网 IP（默认自动检测）

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# ---- 参数解析 ----
TUNNEL_MODE=false
FORCE_HTTP=false
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --tunnel|-t) TUNNEL_MODE=true ;;
    --http)      FORCE_HTTP=true ;;
    *)           POSITIONAL+=("$arg") ;;
  esac
done

# 隧道模式下强制 HTTP（Cloudflare 边缘端提供 HTTPS）
[ "$TUNNEL_MODE" = true ] && FORCE_HTTP=true

# ---- IP 检测 ----
# WSL2 内部 IP（传给 Next.js）
WSL2_IP="${POSITIONAL[0]:-$(ip route get 1 2>/dev/null | awk '{print $7}' || hostname -I | awk '{print $1}')}"

# Windows 主机 IP（手机通过这个 IP 访问）
# 支持手动指定: bash start.sh <WSL2_IP> <WIN_IP>
# 或自动检测（powershell.exe → ip route → resolve.conf）
WIN_IP="${POSITIONAL[1]:-}"
IS_WSL=false
if grep -qi microsoft /proc/sys/kernel/osrelease 2>/dev/null; then
  IS_WSL=true
  if [ -z "$WIN_IP" ] && command -v powershell.exe &>/dev/null; then
    WIN_IP=$(powershell.exe -Command "
      Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
          \$_.InterfaceAlias -notlike '*Loopback*' -and
          \$_.InterfaceAlias -notlike '*WSL*' -and
          \$_.PrefixOrigin -eq 'Dhcp'
        } |
        Select-Object -First 1 -ExpandProperty IPAddress
    " 2>/dev/null | tr -d '\r')
  fi
  if [ -z "$WIN_IP" ]; then
    WIN_IP=$(ip route | grep default | awk '{print $3}')
  fi
  if [ -z "$WIN_IP" ]; then
    WIN_IP=$(cat /etc/resolv.conf 2>/dev/null | grep nameserver | awk '{print $2}')
  fi
fi

# Next.js allowedDevOrigins 用（逗号分隔）
export LAN_IP="$WSL2_IP${WIN_IP:+,$WIN_IP}"

# HTTPS 证书用 IP 列表（去重后传给 https-setup.sh）
CERT_IPS=("$WSL2_IP")
if [ -n "$WIN_IP" ] && [ "$WIN_IP" != "$WSL2_IP" ]; then
  CERT_IPS+=("$WIN_IP")
fi

# ---- HTTPS 证书自动生成 ----
if [ "$FORCE_HTTP" = false ] && [ ! -f ./certs/dev-key.pem -o ! -f ./certs/dev-cert.pem ]; then
  echo "🔐 未检测到 HTTPS 证书，正在自动生成..."
  echo "   包含 IP: ${CERT_IPS[*]}"
  echo ""
  bash scripts/https-setup.sh "${CERT_IPS[@]}"
  echo ""
fi

PROTO="http"
DEV_CMD="dev"
MODE_LABEL="HTTP"
if [ "$FORCE_HTTP" = false ] && [ -f ./certs/dev-key.pem ] && [ -f ./certs/dev-cert.pem ]; then
  PROTO="https"
  DEV_CMD="dev:https"
  MODE_LABEL="HTTPS (PWA 可用)"
fi

# ---- 清理旧 Next.js 进程 ----
CLEAN_PIDS=$(ss -tlnp 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)
if [ -n "$CLEAN_PIDS" ]; then
  echo "🧹 清理残留的 Next.js 进程..."
  echo "$CLEAN_PIDS" | xargs kill -9 2>/dev/null
  sleep 1
fi

# ---- 输出连接信息 ----
echo "=========================================="
echo "  LifeOS - AI 生活助手"
echo "  Mode: $MODE_LABEL"
echo "=========================================="
echo ""
echo "  PC:   ${PROTO}://localhost:3000"

if [ "$PROTO" = "https" ]; then
  echo ""
  echo "  📱 手机/PWA:"
  for ip in "${CERT_IPS[@]}"; do
    echo "    ${PROTO}://${ip}:3000"
  done
else
  echo "  手机: http://${CERT_IPS[0]}:3000"
fi

if [ "$IS_WSL" = true ]; then
  echo ""
  echo "  ⚡ WSL2 环境 (Windows IP: $WIN_IP)"
  echo "     Windows 浏览器访问 https://localhost:3000"
  echo "     手机 访问 https://${WIN_IP}:3000"
  if [ "${WIN_IP##*.}" = "1" ] && [ "$WIN_IP" != "$WSL2_IP" ]; then
    echo ""
    echo "  ⚠️ 检测到的 Windows IP 可能是网关地址"
    echo "     如果手机连不上，请手动指定:"
    echo "     bash start.sh $WSL2_IP <你的Windows WiFi IP>"
  fi
fi

echo ""
echo "  诊断: 右上角 Bug 图标 / ?debug=1"
if [ "$PROTO" = "https" ]; then
  echo "  CA 证书下载: ${PROTO}://localhost:3000/ca.pem"
  if [ "$IS_WSL" = true ]; then
    echo ""
    echo "  📱 Windows 浏览器信任 CA:"
    echo "     打开 https://localhost:3000/ca.pem"
    echo "     下载后双击 → 安装到「受信任的根证书颁发机构」"
    echo "     然后重启浏览器"
  fi
fi
echo "  停止:  Ctrl+C"
echo "=========================================="
echo ""

# ---- WSL2 端口转发 ----
if [ "$IS_WSL" = true ]; then
  PORT_FORWARD_SCRIPT="./port-forward.ps1"
  if [ ! -f "$PORT_FORWARD_SCRIPT" ]; then
    cat > "$PORT_FORWARD_SCRIPT" << PORTFORWARDEOF
#requires -RunAsAdministrator
# LifeOS - WSL2 端口转发（自动生成 by start.sh）
netsh interface portproxy delete v4tov4 listenport=3000 2>\$null
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$WSL2_IP
netsh advfirewall firewall delete rule name="LifeOS Dev Server" 2>\$null
netsh advfirewall firewall add rule name="LifeOS Dev Server" dir=in action=allow protocol=TCP localport=3000
Write-Host "[OK] 端口转发: 0.0.0.0:3000 -> $WSL2_IP:3000" -ForegroundColor Green
netsh interface portproxy show v4tov4
pause
PORTFORWARDEOF
    echo "  已生成端口转发脚本: $PORT_FORWARD_SCRIPT"
    echo "  (Windows 管理员 PowerShell 中运行)"
  fi

  if command -v powershell.exe &>/dev/null; then
    echo "  尝试设置 WSL2 端口转发（需 Windows 管理员权限）..."
    powershell.exe -Command "
      netsh interface portproxy delete v4tov4 listenport=3000;
      netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$WSL2_IP;
      netsh advfirewall firewall delete rule name='LifeOS Dev Server';
      netsh advfirewall firewall add rule name='LifeOS Dev Server' dir=in action=allow protocol=TCP localport=3000
    " 2>/dev/null && echo "  ✅ 端口转发设置成功" || echo "  ⚠️  自动设置需要管理员权限，请手动运行 port-forward.ps1"
  fi
  echo ""
fi

# ---- 隧道模式 ----
if [ "$TUNNEL_MODE" = true ]; then
  echo "  🌐 隧道模式：本地 HTTP + Cloudflare 边缘 HTTPS"
  npm run "$DEV_CMD" &
  DEV_PID=$!

  echo "  等待开发服务器就绪..."
  for i in $(seq 1 30); do
    if curl -sk "$PROTO://localhost:3000" > /dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  echo ""
  echo "=========================================="
  echo "  启动 HTTPS 隧道..."
  echo "=========================================="
  echo ""

  bash scripts/tunnel.sh 3000 "$PROTO"
  TUNNEL_EXIT=$?
  kill $DEV_PID 2>/dev/null
  exit $TUNNEL_EXIT
fi

# ---- 正常模式 ----
npm run "$DEV_CMD"
