#!/usr/bin/env bash
# نسخة احتياطية ليلية: قاعدة البيانات (mysqldump) + مجلد uploads، مع تدوير.
# الإعداد عبر cron:
#   0 2 * * * /GHProjects/jira-monitor/deploy/backup.sh >> /var/log/jem-backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/GHProjects/jira-monitor}"
BACKUP_DIR="${BACKUP_DIR:-/GHProjects/backups}"
KEEP="${KEEP:-14}"   # عدد النسخ المحفوظة لكل نوع

mkdir -p "$BACKUP_DIR"

# حمّل إعدادات قاعدة البيانات من .env.local
if [ -f "$APP_DIR/.env.local" ]; then
  set -a; . "$APP_DIR/.env.local"; set +a
fi

TS="$(date +%Y%m%d-%H%M%S)"
export MYSQL_PWD="${DB_PASSWORD:-}"

# قاعدة البيانات
mysqldump --single-transaction --quick \
  -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" \
  -u "${DB_USER:-root}" "${DB_NAME:-jira_monitor}" \
  | gzip > "$BACKUP_DIR/db-$TS.sql.gz"

# الأصول المرفوعة (الهوية)
if [ -d "$APP_DIR/uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads-$TS.tar.gz" -C "$APP_DIR" uploads
fi

# التدوير: أبقِ آخر KEEP من كل نوع
ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -1t "$BACKUP_DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "✓ backup $TS → $BACKUP_DIR"
