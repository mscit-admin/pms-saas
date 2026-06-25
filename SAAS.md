# التحويل إلى SaaS — نموذج «قاعدة لكل مستأجر»

تحوّل النظام من أحادي المستأجر إلى **SaaS متعدّد المستأجرين** بعزل فيزيائي:
**قاعدة بيانات MySQL مستقلّة لكل منظمة**، وتوجيه عبر **النطاق الفرعي**
(`acme.app.com` ⇒ المنظمة `acme`).

> هذا المستند يغطّي **المرحلتين 1 و2** المنجَزتين. المراحل 3–10 (تسجيل ذاتي،
> فوترة، مشرف أعلى…) لاحقة.

---

## المعمارية

```
            acme.app.com ─┐         beta.app.com ─┐
                          ▼                        ▼
                   ┌─────────────── tenant-mw ───────────────┐
                   │  يستخرج slug من Host ويبحث في التحكّم   │
                   └───────────────────┬─────────────────────┘
                                       ▼
                          tenantContext (AsyncLocalStorage)
                                       ▼
   ┌──────────────┐         ┌──────────────────┐   ┌──────────────────┐
   │ pms_control  │  ←قراءة  │ tenant_acme (DB) │   │ tenant_beta (DB) │
   │ organizations│         │ users, tickets…  │   │ users, tickets…  │
   └──────────────┘         └──────────────────┘   └──────────────────┘
```

- **قاعدة التحكّم `pms_control`**: جدول `organizations` (الاسم، الـ slug،
  اسم القاعدة، الحالة، الخطة) + `reserved_slugs`. مخططها في
  `packages/core/control-db/`.
- **قاعدة كل مستأجر `tenant_<slug>`**: المخطط الحالي **بلا تغيير**
  (`packages/core/db/`). لا حاجة لعمود `org_id` — العزل فيزيائي.

## المكوّنات الجديدة

| الملف | الدور |
|---|---|
| `packages/core/src/tenancy.js` | سياق المستأجر، استخراج الـ slug، البحث، `runInTenant`، أدوات الـ slug |
| `packages/core/src/control-db.js` | اتصال قاعدة التحكّم (`controlQuery`) |
| `packages/core/src/provision.js` | توفير منظمة: إنشاء قاعدة + مخطط + سجلّ + أدمن |
| `packages/core/src/db.js` | **مُعدّل**: تجمّع اتصالات لكل مستأجر، يُحلّ من السياق — **يفشل مغلقاً** بلا سياق |
| `services/api/src/tenant-mw.js` | حارس يترجم النطاق الفرعي إلى منظمة ويرفقها بالطلب |
| `services/api/src/adapter.js` | **مُعدّل**: يلفّ المعالج في `tenantContext` |
| `services/worker/src/index.js` | **مُعدّل**: يدور عبر المنظمات النشطة، مزامنة كلٍّ في سياقه |

## الضمان الأمني

`db.js` **يفشل مغلقاً**: أي استعلام بلا سياق مستأجر يرمي خطأً بدل أن يضرب
قاعدة افتراضية — فلا تتسرّب بيانات مستأجر إلى آخر بسبب سياق ناقص.

## التشغيل (Runbook)

```bash
# 1) هيّئ قاعدة التحكّم (مرّة واحدة)
npm run db:migrate:control -w @pms/core

# 2) وفّر منظمة جديدة (قاعدة + مخطط + أدمن)
npm run provision:tenant -w @pms/core -- --slug acme --name "Acme Inc" --admin-pass s3cret

# 3) ترقية المخطط لاحقاً (كل المستأجرين أو واحد)
npm run db:migrate -w @pms/core                 # الجميع
npm run db:migrate -w @pms/core -- --slug acme  # واحد

# الدخول: https://acme.<APP_ROOT_DOMAIN>
# محلياً: acme.localhost (يعمل في أغلب المتصفّحات دون تعديل hosts)
```

## النشر على الخادم (المنفذ 4447)

النشر عبر **Docker Compose**. الواجهة تُنشَر على المضيف عبر `WEB_PORT` (الافتراضي
الآن **4447**)، والـ API على `127.0.0.1:4448` ليوجّه إليه nginx مسارات `/api`
مباشرةً (حفظ ترويسة Host لازم لتحديد المستأجر).

```bash
# 1) جهّز ملف البيئة
cp .env.docker.example .env
nano .env
#   DB_PASSWORD · SESSION_SECRET · SYNC_SECRET · WEBHOOK_SECRET
#   APP_ROOT_DOMAIN=example.com            (نطاقك)
#   BOOTSTRAP_TENANT_SLUG=acme             (منظمة أولى تُوفَّر تلقائياً)
#   ADMIN_INITIAL_PASSWORD=...             (كلمة مرور admin الأولى)
#   WEB_PORT=4447                          (المنفذ المطلوب)
#   COOKIE_SECURE=true                     (فقط بعد تفعيل HTTPS)

# 2) أقلِع: قاعدة → bootstrap (تحكّم + منظمة) → api + worker + web
docker compose up -d --build

# 3) تحقّق
curl -H 'Host: acme.example.com' http://127.0.0.1:4448/api/health   # عبر الـ API
docker compose logs -f bootstrap                                    # توفير المنظمة
```

**الوصول المباشر (بلا nginx):** الواجهة على `http://IP:4447` — لكن تعدّد
المستأجرين بالنطاق الفرعي يحتاج اسم مضيف (`acme.example.com`)، لذا nginx مُوصى به.

**nginx + النطاقات الفرعية:** انسخ `deploy/nginx-pms-saas.conf` (يطابق
`example.com` و`*.example.com`؛ يوجّه `/api`→4448 و`/`→4447):
```bash
sudo cp deploy/nginx-pms-saas.conf /etc/nginx/sites-available/pms
sudo ln -sf /etc/nginx/sites-available/pms /etc/nginx/sites-enabled/pms
sudo nginx -t && sudo systemctl reload nginx
sudo ufw allow 'Nginx Full'      # وأبقِ 4447/4448 داخليّين
```
**DNS:** سجّلا `A` للجذر و`*` (wildcard):
`example.com → IP` و `*.example.com → IP`. ثم الدخول عبر
`http://acme.example.com` (admin / كلمة المرور التي ضبطتها).

> ملاحظة (Phase 9): جلب الهوية في الـ SSR للواجهة لا يمرّر Host بعد، فيتراجع
> إلى هوية افتراضية في عنوان التبويب/الأيقونة فقط — لا يؤثّر على عزل البيانات
> (كل نداءات المتصفح لـ `/api` تمرّ عبر nginx بالـ Host الصحيح).

## ما الذي تبقّى (المراحل 3–10)

3. **تسجيل ذاتي/Onboarding**: مسار تحكّم على النطاق الجذر يستدعي `provisionTenant`
   + تأكيد بريد + دعوات.
4. **تشفير أسرار المستأجر** (توكنات جيرا، كلمات مرور قواعد التشظية) — الأعمدة
   `db_password_enc` جاهزة.
5. **عامل واعٍ بالمستأجرين**: جدولة/حدود معدّل لكل مستأجر (الأساس موجود).
6. **الفوترة والخطط/الحصص**.
7. **لوحة مشرف أعلى** (إدارة/تعليق/انتحال للدعم).
8. **حدود معدّل ومراقبة موسومة بالمستأجر، تصدير/حذف بيانات**.
9. **توجيه: wildcard DNS/TLS + نطاقات مخصّصة** (يحتاج تعديل خدمة الواجهة web).
10. **اختبارات عزل المستأجرين** (الأهم) + حِمل.
