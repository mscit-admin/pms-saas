# مراقب جيرا (Jira Exception Monitor) — الخلفية

نظام يتصل بـ **Jira Cloud** عبر REST API ويحوّل مئات التذاكر إلى **لوحة استثناءات**
تعرض فقط ما يحتاج تدخّل المدير. هذه الحزمة هي **الخلفية**: Next.js 14 (App Router) + MySQL،
وتغذّي الواجهة الجاهزة `JiraExceptionMonitor.jsx`.

> **قرار معماري:** لا اتصال بجيرا من المتصفح (CORS + الأسرار). كل شيء يمرّ عبر الخلفية.

---

## المتطلبات
- Node.js ≥ 18.18
- MySQL ≥ 8.0 (نستخدم دوال النوافذ `LEAD/LAG` للتحليلات)
- حساب Jira Cloud + API Token

## التهيئة

```bash
# 1) التبعيات
npm install

# 2) الإعدادات — انسخ المثال واملأ القيم (لا تُرفع .env إطلاقاً)
cp .env.example .env.local

# 3) أنشئ قاعدة البيانات ثم طبّق المخطط
#    CREATE DATABASE jira_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
npm run db:migrate

# 4) أول تعبئة للبيانات من جيرا
npm run jira:sync

# 5) تشغيل الخادم
npm run dev          # http://localhost:3000
```

### السحب الدوري (Polling)
```bash
npm run jira:poll    # يسحب كل SYNC_INTERVAL_MINUTES دقيقة
```
أو من مجدول خارجي (cron) عبر استدعاء المسار المحمي:
```bash
curl -X POST "http://localhost:3000/api/sync" -H "x-sync-secret: $SYNC_SECRET"
```

---

## البنية

```
db/schema.sql              مخطط قاعدة البيانات (tickets, ticket_history, sla_config, ...)
src/lib/
  config.js                قراءة متغيرات البيئة في مكان واحد
  db.js                    تجمّع اتصالات MySQL + معاملات
  jira.js                  عميل Jira Cloud (Basic Auth) + ترقيم البحث + changelog
  normalize.js             تطبيع بيانات جيرا الخام إلى صفوف الجداول
  sync.js                  محرّك السحب: upsert التذاكر + إدراج تاريخ الحالات (idempotent)
  exceptions.js            محرّك قواعد الاستثناء (راكد/مراجعة/متأخر/بدون مسؤول)
  analytics.js             أعباء الفريق + الاتجاه + SLA + زمن الدورة + الملخص
src/app/api/               مسارات API التي تغذّي الواجهة
scripts/                   migrate · sync-once · poll
```

## قواعد الاستثناء (قابلة للضبط)
| النوع | الشرط | المتغيّر |
|------|-------|---------|
| راكد | قيد التنفيذ ولم تتغيّر حالته منذ > 3 أيام | `RULE_STAGNANT_DAYS` |
| مراجعة | في مرحلة مراجعة منذ > يومين | `RULE_REVIEW_DAYS` |
| متأخر | تجاوز تاريخ الاستحقاق ولم يُنجَز | — |
| بدون مسؤول | مفتوح وبلا مُسنَد إليه | — |

## SLA حسب الأولوية (قابل للضبط)
القيم البذرية: **عالية 7 · متوسطة 14 · منخفضة 21** يوماً. المصدر الحقيقي جدول `sla_config`،
ويُعدَّل عبر `PUT /api/sla-config`.

## مسارات API
| المسار | الوصف |
|--------|-------|
| `GET /api/health` | فحص اتصال DB + جيرا |
| `POST /api/sync` | تشغيل مزامنة (محمي بـ `SYNC_SECRET`) |
| `GET /api/exceptions?from=&to=` | الاستثناءات التشغيلية + العدّادات |
| `GET /api/workload` | أعباء الفريق |
| `GET /api/analytics/trend?days=30` | اتجاه الاستثناءات عبر الزمن |
| `GET /api/analytics/sla-forecast` | تنبؤ SLA (متجاوز / معرّض / ضمن المهلة) |
| `GET /api/analytics/cycle-time?days=90` | زمن الدورة + البقاء في كل مرحلة |
| `GET /api/analytics/summary` | الملخص التنفيذي |
| `GET\|PUT /api/sla-config` | قراءة/ضبط SLA |

## ربط الواجهة
ضع `JiraExceptionMonitor.jsx` في `src/components/`، ثم في `src/app/page.js`:
```jsx
'use client';
import JiraExceptionMonitor from '@/components/JiraExceptionMonitor';
export default function Page() { return <JiraExceptionMonitor />; }
```
واجعل الواجهة تجلب من مسارات `/api` أعلاه بدل البيانات العيّنة.

## ملاحظات
- جميع التواريخ تُخزَّن بتوقيت **UTC**.
- إدراج التاريخ idempotent عبر `change_id` من changelog جيرا — إعادة السحب آمنة.
- نقطة `/rest/api/3/search` قابلة للتبديل عبر `JIRA_SEARCH_PATH` (لو رحّلت جيرا لاحقاً إلى `search/jql`).
