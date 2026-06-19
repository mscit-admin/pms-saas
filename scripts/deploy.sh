#!/usr/bin/env bash
# تحديث النشر بعد commits جديدة: سحب + تثبيت + بناء + إعادة تشغيل الخدمات.
# التشغيل من جذر المشروع: bash scripts/deploy.sh
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-claude/gifted-archimedes-el3240}"
APP_DIR="${APP_DIR:-/GHProjects/jira-monitor}"

cd "$APP_DIR"

echo "› سحب آخر التغييرات من فرع $BRANCH ..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "› تثبيت التبعيات ..."
npm ci

echo "› بناء الإنتاج ..."
npm run build

echo "› إعادة تشغيل الخدمات ..."
sudo systemctl restart jira-monitor-web jira-monitor-poll

echo "✓ تم النشر. الحالة:"
sudo systemctl --no-pager status jira-monitor-web jira-monitor-poll | head -20
