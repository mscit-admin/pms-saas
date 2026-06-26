#!/usr/bin/env bash
# عامل إصدار شهادات TLS للعملاء الجدد (يعمل على المضيف، يحتاج root).
# يقرأ طابور المضيفين الذي تكتبه الحاوية ويُصدر شهادة لكل واحد عبر certbot+nginx.
# التشغيل عبر cron كل دقيقة:
#   * * * * * root /GHProjects/pms-saas/deploy/cert-worker.sh >> /var/log/pms-cert.log 2>&1
set -euo pipefail

QUEUE="${CERT_QUEUE_FILE:-/GHProjects/pms-saas/cert-queue/pending.txt}"
EMAIL="${CERT_EMAIL:-admin@gh.com.ly}"
LOCK="/tmp/pms-cert-worker.lock"

[ -f "$QUEUE" ] || exit 0

# قفل لمنع التشغيل المتزامن
exec 9>"$LOCK"
flock -n 9 || exit 0

# خذ محتوى الطابور ذرّياً ثم أفرغه
WORK="$(mktemp)"
mv "$QUEUE" "$WORK"
: > "$QUEUE"

sort -u "$WORK" | while IFS= read -r host; do
  [ -z "$host" ] && continue
  echo "$(date -u +%FT%TZ) issuing $host"
  if certbot --nginx -d "$host" --expand --non-interactive --agree-tos -m "$EMAIL" --redirect; then
    echo "$(date -u +%FT%TZ) ok $host"
  else
    echo "$(date -u +%FT%TZ) FAIL $host — re-queued"
    echo "$host" >> "$QUEUE"   # أعِده للطابور لإعادة المحاولة لاحقاً
  fi
done

rm -f "$WORK"
