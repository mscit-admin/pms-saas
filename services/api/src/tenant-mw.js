// طبقة تحديد المستأجر لخدمة الـ API — تترجم النطاق الفرعي إلى منظمة.
//   acme.app.com → org(slug=acme) → يُرفَق بالطلب (req.tenantOrg)
// النطاق الجذر/www (بلا نطاق فرعي) = مستوى تحكّم: لا مستأجر (للتسجيل/المشرف).
// نطاق فرعي غير معروف أو منظمة معلّقة ⇒ يُرفَض الطلب مبكراً.
//
// المُكيِّف (adapter.js) يلفّ المعالج في سياق هذا المستأجر، فتعمل كل
// استعلامات db.js على قاعدة المستأجر الصحيحة تلقائياً.
import { slugFromHost, findOrgBySlug } from '@pms/core/tenancy';

// ذاكرة مؤقتة قصيرة للمنظمات (slug → {org, exp}) لتفادي استعلام التحكّم لكل طلب.
const CACHE_TTL_MS = 30_000;
const cache = new Map();

async function resolveOrg(slug) {
  const hit = cache.get(slug);
  if (hit && hit.exp > Date.now()) return hit.org;
  const org = await findOrgBySlug(slug);
  cache.set(slug, { org, exp: Date.now() + CACHE_TTL_MS });
  return org;
}

// مسح إدخال من الذاكرة المؤقتة (يُستدعى عند تعليق/حذف منظمة لاحقاً).
export function invalidateOrgCache(slug) {
  cache.delete(slug);
}

export function tenantGate() {
  return async (req, res, next) => {
    try {
      let slug = slugFromHost(req.headers.host);
      if (!slug) {
        // لا نطاق فرعي (IP عارٍ / apex). إن ضُبط DEFAULT_TENANT_SLUG نقع عليه —
        // يفيد النشر بعنوان IP فقط أو خلف شبكة تحجب نطاقات wildcard مثل nip.io.
        const def = process.env.DEFAULT_TENANT_SLUG;
        if (!def) {
          // مستوى تحكّم: لا مستأجر. المسارات التي تتطلّبه تفشل مغلقةً في db.js.
          req.tenantOrg = null;
          return next();
        }
        slug = def;
      }
      const org = await resolveOrg(slug);
      if (!org) {
        return res.status(404).json({ ok: false, error: 'هذه المنظمة غير موجودة.' });
      }
      if (org.status === 'suspended') {
        return res.status(403).json({ ok: false, error: 'هذه المنظمة معلّقة. راجع الفوترة/الدعم.' });
      }
      if (org.status !== 'active') {
        return res.status(503).json({ ok: false, error: 'هذه المنظمة قيد التهيئة. حاول لاحقاً.' });
      }
      req.tenantOrg = org;
      next();
    } catch (err) {
      next(err);
    }
  };
}
