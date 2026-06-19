# دليل النشر على خادم Ubuntu (من GitHub)

نشر **مراقب جيرا** على خادم Ubuntu. القيم المستخدمة هنا:
- المسار: `/GHProjects/jira-monitor`
- منفذ التطبيق: `4445`
- الفرع: `claude/gifted-archimedes-el3240`

التطبيق يشغّل **عمليتين**: خادم الويب (Next.js) وعامل السحب الدوري (Polling).

---

## 0) المتطلبات على الخادم

```bash
sudo apt-get update

# Node.js 20 LTS + git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# MySQL 8 + Nginx
sudo apt-get install -y mysql-server nginx
sudo mysql_secure_installation
```
تحقّق: `node -v` (≥ 18.18) و `mysql --version` (≥ 8.0).

---

## 1) قاعدة البيانات

```bash
sudo mysql
```
```sql
CREATE DATABASE jira_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jira_monitor'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON jira_monitor.* TO 'jira_monitor'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 2) سحب الكود من GitHub إلى /GHProjects

```bash
sudo mkdir -p /GHProjects && cd /GHProjects
sudo git clone -b claude/gifted-archimedes-el3240 \
  https://github.com/mscit-admin/pms.git jira-monitor
sudo chown -R $USER:$USER /GHProjects/jira-monitor
cd /GHProjects/jira-monitor
```
> مستودع خاص؟ صادِق أولاً (deploy key أو PAT داخل الرابط).

---

## 3) الإعدادات + البناء + المخطط

```bash
npm ci

cp .env.example .env.local
nano .env.local        # املأ القيم الحقيقية (أدناه)

npm run db:migrate     # إنشاء الجداول
npm run build          # بناء الإنتاج
npm run jira:sync      # أول تعبئة للبيانات — تأكّد أنها تعمل
```

الحد الأدنى في `.env.local`:
```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=xxxxxxxx
JIRA_JQL=project = OPS ORDER BY updated DESC

DB_HOST=127.0.0.1
DB_USER=jira_monitor
DB_PASSWORD=STRONG_PASSWORD_HERE
DB_NAME=jira_monitor

SYNC_SECRET=any_long_random_string
SYNC_INTERVAL_MINUTES=5
```
> `.env.local` مُستبعَد من git — تبقى الأسرار خارج GitHub.

---

## 4) خدمات systemd (ويب + سحب)

ملفات الوحدات جاهزة في مجلد `deploy/`. انسخها وفعّلها:

```bash
sudo cp deploy/jira-monitor-web.service  /etc/systemd/system/
sudo cp deploy/jira-monitor-poll.service /etc/systemd/system/

# منح www-data ملكية المجلد (الخدمات تعمل بهذا المستخدم)
sudo chown -R www-data:www-data /GHProjects/jira-monitor

sudo systemctl daemon-reload
sudo systemctl enable --now jira-monitor-web jira-monitor-poll
sudo systemctl status jira-monitor-web jira-monitor-poll
```

> الخادم سيستمع على المنفذ **4445** (مضبوط داخل وحدة الويب: `Environment=PORT=4445`).
> لتشغيل الخدمات بمستخدمك بدل `www-data`، غيّر `User=` في الملفين ثم `daemon-reload`.

---

## 5) Nginx (وكيل عكسي + HTTPS)

```bash
sudo cp deploy/nginx-jira-monitor.conf /etc/nginx/sites-available/jira-monitor
sudo nano /etc/nginx/sites-available/jira-monitor   # ضع server_name الصحيح
sudo ln -s /etc/nginx/sites-available/jira-monitor /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS مجاني مع تجديد تلقائي
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 6) الجدار الناري

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # 80 + 443
sudo ufw enable
```
> الوصول عبر Nginx فقط — أبقِ المنفذ 4445 داخلياً. إن أردت الوصول المباشر `http://IP:4445` فافتحه: `sudo ufw allow 4445`.

---

## 7) التحقّق

```bash
curl http://127.0.0.1:4445/api/health        # يجب أن يُظهر db:true, jira:true
journalctl -u jira-monitor-poll -f           # متابعة سجلّ السحب
journalctl -u jira-monitor-web -n 50         # سجلّ الويب
```

---

## 8) التحديث بعد commits جديدة

```bash
cd /GHProjects/jira-monitor
bash scripts/deploy.sh
```
السكربت: يسحب الفرع، `npm ci`، `npm run build`، ثم يعيد تشغيل الخدمتين.

---

## 9) حماية الوصول + Webhooks + إعادة بناء الاتجاه

**حماية اللوحة (تسجيل دخول):** اضبط في `.env.local` ثم أعد تشغيل الويب.
```
AUTH_USER=admin
AUTH_PASSWORD=كلمة_مرور_قوية
```
بدونهما يبقى الوصول مفتوحاً. بعد ضبطهما يطلب المتصفح اسم مستخدم/كلمة مرور.
المنفذ الآلي `/api/sync` و `/api/webhook` مُستثنيان (لهما أسرارهما).

**إعادة بناء الاتجاه** (ملء الرسم فوراً من التاريخ بدل انتظار الأيام):
```bash
npm run jira:backfill          # آخر 30 يوماً (متأخر/راكد/مراجعة)
```

**Webhooks (تحديث فوري بدل الانتظار):** في جيرا → Settings → System → WebHooks → Create:
- URL: `http://84.247.128.198/api/webhook?secret=قيمة_WEBHOOK_SECRET`
- Events: Issue created / updated / deleted
بعدها أي تغيّر في تذكرة يصل فوراً. يبقى عامل السحب يعمل كشبكة أمان.

## 10) تطبيق تغيير المنفذ تلقائياً (اختياري)

لجعل تغيير المنفذ من واجهة الإدارة يُعيد تشغيل الخدمة ويحدّث nginx تلقائياً:

```bash
# 1) ثبّت سكربت التطبيق (يعمل بصلاحية root)
sudo cp deploy/jem-apply-port.sh /usr/local/bin/jem-apply-port
sudo chmod 755 /usr/local/bin/jem-apply-port

# 2) امنح مستخدم الخدمة صلاحية تشغيله فقط بلا كلمة مرور
sudo cp deploy/jem-sudoers /etc/sudoers.d/jem-apply-port
sudo chmod 440 /etc/sudoers.d/jem-apply-port
sudo visudo -cf /etc/sudoers.d/jem-apply-port    # تحقّق من الصياغة

# 3) فعّل قراءة systemd لملف المنفذ (وحدة الويب تحوي EnvironmentFile=-.../port.env)
sudo cp deploy/jira-monitor-web.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl restart jira-monitor-web
```

كيف يعمل: عند حفظ منفذ جديد، يكتب التطبيق `port.env` ثم يشغّل `sudo jem-apply-port`
الذي يحدّث `proxy_pass` في nginx، يعيد تحميله، ويعيد تشغيل خدمة الويب. حدّث الصفحة بعد لحظات.

> إن لم تُثبّت الخطوات أعلاه، يبقى المنفذ محفوظاً في قاعدة البيانات لكن لا يُعاد التشغيل
> تلقائياً — يظهر تنبيه في الواجهة. لتعطيل المحاولة كلياً اضبط `PORT_APPLY_CMD=` فارغاً.

## 11) الإشعارات + الملخّص الدوري + إجراءات التذاكر

**التنبيهات:** اضبط `ALERT_WEBHOOK_URL` (Slack/Teams) و/أو إعدادات `SMTP_*` + `ALERT_EMAIL_TO`
في `.env.local`. بعدها يرسل عامل السحب تنبيهاً تلقائياً بأي استثناء جديد. لتعطيلها: `ALERTS_ENABLED=false`.

**الملخّص الدوري بالبريد** عبر cron:
```bash
# كل يوم 7 صباحاً
0 7 * * * cd /GHProjects/jira-monitor && /usr/bin/npm run digest >> /var/log/jem-digest.log 2>&1
```

**إجراءات التذاكر (Write-back):** امنح الدور صلاحية `act_tickets` من لوحة الأدوار،
فيظهر زر إجراءات في جدول الاستثناءات (تعليق · إسناد · نقل حالة) يكتب مباشرة في جيرا.
> أعد تشغيل `npm run seed:admin` مرة لإضافة صلاحية `act_tickets` لدور Admin.

**تصدير CSV:** زر في شريط التصنيف يصدّر النتائج المفلترة (يدعم العربية في Excel).

## ملاحظات
- المزامنة عبر **عامل السحب** (`jira-monitor-poll`) كل `SYNC_INTERVAL_MINUTES` — لا حاجة لـ cron.
  بديل: احذف خدمة poll واستخدم cron مع المسار المحمي:
  ```
  */5 * * * * curl -fsS -X POST "http://127.0.0.1:4445/api/sync" -H "x-sync-secret: YOUR_SECRET"
  ```
- التطبيق وقاعدة البيانات على نفس الخادم؛ أبقِ MySQL مربوطاً بـ `127.0.0.1` (الافتراضي).
- التواريخ كلها UTC؛ السحب idempotent — إعادة التشغيل آمنة.
