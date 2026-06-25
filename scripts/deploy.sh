#!/usr/bin/env bash
# تحديث النشر (خدمات مصغّرة عبر Docker Compose):
#   سحب الفرع → إعادة بناء الصور → تشغيل (db · migrate · api · worker · web) → بذر الصلاحيات.
# التشغيل من جذر المشروع:  bash scripts/deploy.sh
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-claude/gifted-archimedes-el3240}"
APP_DIR="${APP_DIR:-/GHProjects/jira-monitor}"

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "✗ لا يوجد ملف .env — انسخ القالب واملأه أولاً ثم أعد المحاولة:"
  echo "    cp .env.docker.example .env && nano .env"
  exit 1
fi

# اختَر أمر compose المتاح (الإضافة الحديثة أو الثنائي القديم)
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "✗ Docker Compose غير مثبّت على هذا الخادم."
  exit 1
fi

echo "› سحب آخر التغييرات من فرع $BRANCH ..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "› إعادة البناء والتشغيل (db · migrate · api · worker · web) ..."
$DC up -d --build

echo "› بذر الأدوار/الصلاحيات الجديدة (آمن للتكرار) ..."
$DC run --rm api node /app/packages/core/scripts/seed-admin.js || true

echo "✓ تم النشر. الحالة:"
$DC ps
