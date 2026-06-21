#!/bin/bash
# LifeOS - HTTPS 开发证书一键设置 (方案 B)
# 安装 mkcert → 创建本地 CA → 为局域网 IP 生成证书
# 手机装 CA 后，直接用 https://<LAN-IP>:3000 访问
#
# 用法: bash scripts/https-setup.sh [LAN-IP]
#   不传参数时自动检测 WSL2 IP
#   传参时使用指定 IP（如 Windows 转发场景: bash scripts/https-setup.sh 192.168.31.111）

set -e
CERTS_DIR="$(dirname "$0")/../certs"
mkdir -p "$CERTS_DIR"
CERTS_DIR="$(cd "$CERTS_DIR" && pwd)"

MKCERT_BIN="/tmp/mkcert"
CA_DIR="${HOME}/.local/share/mkcert"

echo "=========================================="
echo "  LifeOS - HTTPS 开发证书设置"
echo "=========================================="
echo ""

detect_lan_ip() {
  ip route get 1 2>/dev/null | awk '{print $7}' || \
  hostname -I 2>/dev/null | awk '{print $1}' || \
  echo "127.0.0.1"
}

LAN_IP="${1:-$(detect_lan_ip)}"

install_mkcert() {
  if command -v mkcert &>/dev/null; then
    echo "✅ mkcert 已安装"
    MKCERT_CMD="mkcert"
    return 0
  fi
  if [ -x "$MKCERT_BIN" ]; then
    echo "✅ mkcert 已就绪"
    MKCERT_CMD="$MKCERT_BIN"
    return 0
  fi
  echo "⬇️  正在下载 mkcert..."
  local URL="https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64"
  if curl -#SL "$URL" -o "$MKCERT_BIN" 2>&1; then
    chmod +x "$MKCERT_BIN"
    MKCERT_CMD="$MKCERT_BIN"
    echo "✅ mkcert 下载完成"
    return 0
  fi
  echo "❌ 下载失败，请手动安装: https://github.com/FiloSottile/mkcert"
  exit 1
}

install_mkcert

if [ -f "$CA_DIR/rootCA.pem" ]; then
  echo "🔐 CA 证书已存在 ($CA_DIR/rootCA.pem)"
else
  echo "🔐 正在创建本地 CA..."
  $MKCERT_CMD -install 2>/dev/null || echo "⚠️  系统 CA 安装需要 sudo，跳过（手机需要手动安装 CA）"
fi

if [ ! -f "$CA_DIR/rootCA.pem" ]; then
  echo "❌ CA 证书不存在，请手动执行: $MKCERT_CMD -install"
  exit 1
fi

echo "🔐 正在生成证书 (localhost, 127.0.0.1, $LAN_IP)..."
$MKCERT_CMD -key-file "$CERTS_DIR/dev-key.pem" -cert-file "$CERTS_DIR/dev-cert.pem" \
  localhost 127.0.0.1 ::1 "$LAN_IP"

PUBLIC_DIR="$(dirname "$0")/../public"
cp "$CA_DIR/rootCA.pem" "$PUBLIC_DIR/ca.pem"

echo ""
echo "=========================================="
echo "  ✅ HTTPS 证书就绪"
echo "=========================================="
echo ""
echo "  启动:   npm run dev:https  或  bash start.sh"
echo ""
echo "  PC:     https://localhost:3000"
echo "  手机:   https://${LAN_IP}:3000 (PWA 可安装)"
echo ""
echo "=============================="
echo "  📱 手机安装 CA 证书（仅首次）"
echo "=============================="
echo ""
echo "  手机访问（需先启动 start.sh）:"
echo "    https://${LAN_IP}:3000/ca.pem"
echo "  下载后:"
echo "    Android → 设置 → 安全 → 安装 CA 证书"
echo "    iOS → 设置 → 通用 → VPN 与设备管理 → 安装 → 启用"
