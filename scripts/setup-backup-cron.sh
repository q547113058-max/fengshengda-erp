#!/usr/bin/env bash
# 一键安装 ERP 每日备份
# 用法：sudo bash scripts/setup-backup-cron.sh
# 需 sudo，会要求输入 DB 密码
set -euo pipefail

# === 配 ===
read -p "DB host [127.0.0.1]: " DB_HOST
DB_HOST=${DB_HOST:-127.0.0.1}

read -p "DB port [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "DB user [erp_user]: " DB_USER
DB_USER=${DB_USER:-erp_user}

read -s -p "DB password: " DB_PASS
echo

read -p "DB name [fengshengda_erp]: " DB_NAME
DB_NAME=${DB_NAME:-fengshengda_erp}

read -p "Backup dir [/data/backups/erp]: " BACKUP_DIR
BACKUP_DIR=${BACKUP_DIR:-/data/backups/erp}

read -p "保留天数 [14]: " RETAIN_DAYS
RETAIN_DAYS=${RETAIN_DAYS:-14}

# === 写凭据（root only）===
echo ""
echo "📝 写 /etc/default/erp-backup (chmod 600)..."
cat > /etc/default/erp-backup <<EOF
# ERP 备份凭据（root only）
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_NAME=$DB_NAME
BACKUP_DIR=$BACKUP_DIR
RETAIN_DAYS=$RETAIN_DAYS
EOF
chmod 600 /etc/default/erp-backup
echo "  ✓ /etc/default/erp-backup"

# === 部署 cron 脚本 ===
SCRIPT_SRC="$(cd "$(dirname "$0")" && pwd)/cron-backup.sh"
SCRIPT_DST="/etc/cron.daily/erp-backup"

if [ ! -f "$SCRIPT_SRC" ]; then
  echo "❌ 找不到 $SCRIPT_SRC"
  exit 1
fi

cp "$SCRIPT_SRC" "$SCRIPT_DST"
chmod +x "$SCRIPT_DST"
echo "  ✓ $SCRIPT_DST"

# === 准备备份目录 ===
mkdir -p "$BACKUP_DIR"
echo "  ✓ 备份目录：$BACKUP_DIR"

# === 测跑一次 ===
echo ""
echo "🧪 测试跑一次..."
"$SCRIPT_DST"

# === 验证 ===
echo ""
echo "📋 验证："
ls -lah "$BACKUP_DIR/" | head -5
echo ""
tail -5 /var/log/erp-backup.log

echo ""
echo "✅ 备份 cron 已就位"
echo "   每日 3:00 自动跑（/etc/cron.daily/）"
echo "   日志：tail -f /var/log/erp-backup.log"
