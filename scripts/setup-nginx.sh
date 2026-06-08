#!/usr/bin/env bash
# 一键部署 nginx 反代 + Let's Encrypt HTTPS
# 用法：sudo bash scripts/setup-nginx.sh
# 前提：DNS A 记录已指向本机公网 IP
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "❌ 请用 sudo 跑"
  exit 1
fi

# === 配 ===
read -p "域名 (例 erp.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo "❌ 域名不能空"
  exit 1
fi

read -p "后端地址 [http://127.0.0.1:3003]: " BACKEND_URL
BACKEND_URL=${BACKEND_URL:-http://127.0.0.1:3003}

read -p "前端 dist 路径 [/data/erp-system/frontend/dist]: " FRONTEND_DIST
FRONTEND_DIST=${FRONTEND_DIST:-/data/erp-system/frontend/dist}

read -p "上传目录 [/data/erp-system/uploads]: " UPLOAD_DIR
UPLOAD_DIR=${UPLOAD_DIR:-/data/erp-system/uploads}

# 域名正则（拿主域 + 通配）
MAIN_DOMAIN=$(echo "$DOMAIN" | awk -F. '{print $(NF-1)"."$NF}')
echo ""
echo "🔧 配置:"
echo "  域名:     $DOMAIN"
echo "  主域:     $MAIN_DOMAIN"
echo "  后端:     $BACKEND_URL"
echo "  前端:     $FRONTEND_DIST"
echo "  上传目录: $UPLOAD_DIR"
read -p " 继续？(y/N) " CONTINUE
if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
  echo "取消"
  exit 0
fi

# === 检查 nginx + certbot ===
echo ""
echo "📦 检查 nginx + certbot..."
if ! command -v nginx >/dev/null 2>&1; then
  echo "装 nginx..."
  apt update
  apt install -y nginx
fi
if ! command -v certbot >/dev/null 2>&1; then
  echo "装 certbot..."
  apt install -y certbot python3-certbot-nginx
fi

# === 申请证书 ===
echo ""
echo "🔐 申请 Let's Encrypt 证书..."
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
else
  echo "  证书已存在：/etc/letsencrypt/live/$DOMAIN/"
fi

# === 写 nginx 配置 ===
echo ""
echo "📝 写 nginx 站点配置..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONF_SRC="$SCRIPT_DIR/../nginx/erp.example.com.conf"
CONF_DST="/etc/nginx/sites-available/erp"

if [ ! -f "$CONF_SRC" ]; then
  echo "❌ 找不到 $CONF_SRC"
  exit 1
fi

# 替换占位符
sed -e "s|erp\.example\.com|$DOMAIN|g" \
    -e "s|http://127\.0\.0\.1:3003|$BACKEND_URL|g" \
    -e "s|/data/erp-system/frontend/dist|$FRONTEND_DIST|g" \
    -e "s|/data/erp-system/server/uploads|$UPLOAD_DIR|g" \
    "$CONF_SRC" > "$CONF_DST"

# 启用
ln -sf "$CONF_DST" /etc/nginx/sites-enabled/erp

# 删 default（如果存在）
rm -f /etc/nginx/sites-enabled/default

# 验证
nginx -t

# 准备上传目录
mkdir -p "$UPLOAD_DIR"
chown -R www-data:www-data "$UPLOAD_DIR"

# === 配 certbot 自动 reload ===
echo ""
echo "🔄 配 certbot 续期后自动 reload nginx..."
HOOK_DIR="/etc/letsencrypt/renewal-hooks/deploy"
mkdir -p "$HOOK_DIR"
cat > "$HOOK_DIR/reload-nginx.sh" <<EOF
#!/usr/bin/env bash
systemctl reload nginx
EOF
chmod +x "$HOOK_DIR/reload-nginx.sh"

# === 重载 nginx ===
echo ""
echo "🚀 重载 nginx..."
systemctl reload nginx

# === 验证 ===
echo ""
echo "🧪 验证..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/health" || echo "000")
echo "  HTTP $HTTP_CODE http://$DOMAIN/health"

HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health" || echo "000")
echo "  HTTPS $HTTPS_CODE https://$DOMAIN/health"

if [ "$HTTPS_CODE" = "200" ]; then
  echo ""
  echo "✅ 部署完成"
  echo "   访问: https://$DOMAIN"
  echo "   Swagger: https://$DOMAIN/api/docs （限内网）"
else
  echo ""
  echo "⚠️  HTTPS 不可达，检查："
  echo "   1. DNS 解析: dig $DOMAIN"
  echo "   2. 防火墙:  sudo ufw status"
  echo "   3. 证书:    sudo certbot certificates"
  echo "   4. nginx:   sudo tail -f /var/log/nginx/erp.error.log"
fi
