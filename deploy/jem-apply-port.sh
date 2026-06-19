#!/usr/bin/env bash
# يُطبّق رقم منفذ جديد: يحدّث upstream في nginx ثم يعيد تشغيل خدمة الويب.
# يُشغَّل بصلاحية root (عبر sudo من التطبيق). يقرأ المنفذ من port.env.
#
# التثبيت:
#   sudo cp deploy/jem-apply-port.sh /usr/local/bin/jem-apply-port
#   sudo chmod 755 /usr/local/bin/jem-apply-port
# وامنح www-data صلاحية تشغيله بلا كلمة مرور (انظر deploy/jem-sudoers).
set -euo pipefail

APP_DIR="${APP_DIR:-/GHProjects/jira-monitor}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/jira-monitor}"
PORT_ENV="$APP_DIR/port.env"

# امهل الطلب لحظة كي تُرسَل الاستجابة قبل إعادة التشغيل
sleep 2

# استخرج المنفذ (أرقام فقط) من port.env
PORT="$(grep -oE '[0-9]+' "$PORT_ENV" | head -1 || true)"
if [ -z "${PORT:-}" ] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  echo "منفذ غير صالح في $PORT_ENV" >&2
  exit 1
fi

# حدّث upstream في nginx (إن وُجد الملف) ثم اختبر وأعد التحميل
if [ -f "$NGINX_SITE" ]; then
  sed -i -E "s#proxy_pass http://127\.0\.0\.1:[0-9]+#proxy_pass http://127.0.0.1:${PORT}#" "$NGINX_SITE"
  nginx -t && systemctl reload nginx
fi

# أعد تشغيل خدمة الويب لتلتقط PORT الجديد من port.env
systemctl restart jira-monitor-web

echo "✓ طُبّق المنفذ $PORT"
