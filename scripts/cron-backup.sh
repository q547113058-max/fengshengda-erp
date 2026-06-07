#!/usr/bin/env bash
# MariaDB 每日 3:00 自动备份
# 保留 14 天（公司 ERP 数据惯例）；每天全量 dump + gzip
# 用法：sudo cp scripts/cron-backup.sh /etc/cron.daily/erp-backup && sudo chmod +x /etc/cron.daily/erp-backup
set -euo pipefail

# === 配置（按实际改）===
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-erp_user}
DB_PASS=${DB_PASS:-erp_pass_2026}
DB_NAME=${DB_NAME:-fengshengda_erp}
BACKUP_DIR=${BACKUP_DIR:-/data/backups/erp}
RETAIN_DAYS=${RETAIN_DAYS:-14}

# 备份文件名：erp_2026-06-07_03-00.sql.gz
TS=$(date +%Y-%m-%d_%H-%M)
FILENAME="erp_${DB_NAME}_${TS}.sql.gz"
LOG="/var/log/erp-backup.log"

mkdir -p "$BACKUP_DIR"

# 写日志
echo "[$(date '+%F %T')] start backup → $FILENAME" | tee -a "$LOG"

# mysqldump（注意 --single-transaction 一致性 + --routines 保留存储过程）
mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"

# 校验
if [ -s "$BACKUP_DIR/$FILENAME" ]; then
  SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
  echo "[$(date '+%F %T')] ✓ backup OK ($SIZE) → $BACKUP_DIR/$FILENAME" | tee -a "$LOG"
else
  echo "[$(date '+%F %T')] ✗ backup FAILED (empty file)" | tee -a "$LOG"
  exit 1
fi

# 删 14 天前
DELETED=$(find "$BACKUP_DIR" -name "erp_${DB_NAME}_*.sql.gz" -mtime +$RETAIN_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date '+%F %T')] removed $DELETED old backups (>${RETAIN_DAYS} days)" | tee -a "$LOG"
fi

# 备份总数
TOTAL=$(ls "$BACKUP_DIR"/erp_${DB_NAME}_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date '+%F %T')] total backups on disk: $TOTAL" | tee -a "$LOG"
