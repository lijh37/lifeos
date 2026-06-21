#!/bin/bash
# LifeOS - HTTPS 隧道脚本 (PWA 安装必需 HTTPS)
# 自动安装 cloudflared → fallback ngrok/lt

PORT=${1:-3000}
CLOUDFLARED_BIN="/tmp/cloudflared"

echo "=========================================="
echo "  LifeOS - HTTPS 隧道 (PWA 必需)"
echo "  手机打开输出的 HTTPS 地址 → 点 Install"
echo "=========================================="
echo ""

if ! curl -s http://localhost:$PORT > /dev/null 2>&1; then
  echo "❌ 开发服务器未运行，请先执行: npm run dev"
  exit 1
fi

ensure_cloudflared() {
  if [ -x "$CLOUDFLARED_BIN" ]; then
    echo "✅ cloudflared 已就绪"
    return 0
  fi
  if command -v cloudflared &>/dev/null; then
    CLOUDFLARED_BIN=$(command -v cloudflared)
    echo "✅ cloudflared 已安装"
    return 0
  fi
  echo "⏳ 正在下载 cloudflared (约 100MB)..."
  local URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
  if curl -#SL "$URL" -o "$CLOUDFLARED_BIN" 2>&1; then
    chmod +x "$CLOUDFLARED_BIN"
    echo "✅ cloudflared 下载完成"
    return 0
  fi
  echo "⚠️  cloudflared 下载失败，尝试其他方式..."
  return 1
}

try_cloudflared() {
  echo "🚀 启动 cloudflared..."
  echo "   手机访问: https://xxxx.trycloudflare.com"
  echo ""
  "$CLOUDFLARED_BIN" tunnel --url "http://localhost:$PORT"
}

try_ngrok() {
  if command -v ngrok &>/dev/null; then
    echo "🚀 使用 ngrok..."
    ngrok http "$PORT" --log=stdout 2>&1 | grep -m1 "url=" || ngrok http "$PORT"
    return 0
  fi
  return 1
}

try_localtunnel() {
  if command -v lt &>/dev/null; then
    echo "⚠️  使用 localtunnel (可能被拦截)"
    lt --port "$PORT"
    return 0
  fi
  return 1
}

if ensure_cloudflared; then
  try_cloudflared
  exit $?
fi

try_ngrok && exit 0
try_localtunnel && exit 0

echo ""
echo "=========================================="
echo "  所有隧道方式均不可用，手动安装:"
echo "=========================================="
echo ""
echo "  cloudflared:  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared && chmod +x /tmp/cloudflared"
echo ""
echo "  ngrok:        https://ngrok.com/download"
echo ""
echo "  localtunnel:  npm install -g localtunnel"
echo ""
exit 1
