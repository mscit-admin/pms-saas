// طبقة المستأجرين (Multi-tenancy) — نموذج: قاعدة بيانات لكل مستأجر.
//
// المسؤوليات:
//   1) سياق المستأجر الجاري (AsyncLocalStorage) — منه يعرف db.js أي قاعدة يصل.
//   2) استخراج النطاق الفرعي من Host وتحويله إلى منظمة من قاعدة التحكّم.
//   3) تشغيل عمل ضمن سياق مستأجر محدّد (للسكربتات والعامل خارج الطلبات).
//   4) أدوات توفير قاعدة المستأجر (إنشاء/حذف) للتسجيل الذاتي لاحقاً.
//
// قرار أمني محوري: db.js «يفشل مغلقاً» — أي استعلام بلا سياق مستأجر يرمي خطأ،
// فلا تتسرّب بيانات مستأجر إلى آخر بسبب سياق ناقص.
import { AsyncLocalStorage } from 'node:async_hooks';
import { controlQuery } from './control-db.js';
import { tenancyConfig } from './config.js';

// السياق يحمل المنظمة الجارية: { id, name, slug, dbName, dbHost?, ... }
export const tenantContext = new AsyncLocalStorage();

// ---- السياق الجاري ----
export function getCurrentOrg() {
  return tenantContext.getStore()?.org || null;
}

// يُستخدم في db.js: يرمي إن لم يوجد سياق مستأجر (فشل مغلق).
export function requireCurrentOrg() {
  const org = getCurrentOrg();
  if (!org) {
    throw new Error('لا يوجد سياق مستأجر (tenant) — رُفض الوصول لقاعدة البيانات.');
  }
  return org;
}

// تشغيل دالّة ضمن سياق منظمة محدّدة (سكربتات/عامل/توفير).
export function runInTenant(org, fn) {
  if (!org?.dbName) throw new Error('runInTenant: منظمة بلا dbName.');
  return tenantContext.run({ org }, fn);
}

// ---- النطاق الفرعي ----
// نطاق فرعي صالح: حروف لاتينية صغيرة وأرقام وشَرطات، 1..63، لا يبدأ/ينتهي بشَرطة.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug);
}

// تطبيع اسم إلى slug مرشّح (للاقتراح عند التسجيل).
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63) || '';
}

// استخراج النطاق الفرعي من ترويسة Host بالنسبة لجذر النطاق المهيّأ.
//   acme.app.com   (root app.com)        → 'acme'
//   acme.localhost (root localhost)       → 'acme'
//   app.com / www.app.com / localhost     → null  (مستوى تحكّم/تسويق)
//   acme.beta.app.com                     → 'acme.beta' (يُعامَل كنطاق مخصّص لاحقاً)
export function slugFromHost(host) {
  if (!host) return null;
  // إزالة المنفذ والحالة
  let h = String(host).toLowerCase().split(':')[0].replace(/\.+$/, '');
  const root = tenancyConfig.rootDomain.toLowerCase();
  if (h === root) return null;                  // النطاق الجذر نفسه
  const suffix = `.${root}`;
  if (!h.endsWith(suffix)) return null;          // نطاق غير معروف (قد يكون مخصّصاً لاحقاً)
  const sub = h.slice(0, -suffix.length);
  if (!sub || sub === 'www') return null;        // www = مستوى التحكّم
  return sub;
}

// ---- البحث عن المنظمة ----
export async function findOrgBySlug(slug) {
  if (!isValidSlug(slug)) return null;
  const rows = await controlQuery(
    `SELECT id, name, slug, db_name AS dbName, db_host AS dbHost, db_port AS dbPort,
            db_user AS dbUser, db_password_enc AS dbPasswordEnc, status, plan
       FROM organizations WHERE slug = :slug LIMIT 1`,
    { slug }
  );
  return rows[0] || null;
}

// كل المنظمات النشطة — للعامل والمهام الدورية (يدور عبرها مستأجراً مستأجراً).
export async function listActiveOrgs() {
  return controlQuery(
    `SELECT id, name, slug, db_name AS dbName, db_host AS dbHost, db_port AS dbPort,
            db_user AS dbUser, db_password_enc AS dbPasswordEnc, status, plan
       FROM organizations WHERE status = 'active' ORDER BY id`
  );
}

export async function isSlugReserved(slug) {
  const rows = await controlQuery(
    'SELECT 1 FROM reserved_slugs WHERE slug = :slug LIMIT 1',
    { slug }
  );
  return rows.length > 0;
}

// النطاقات الفرعية المتاحة للتسجيل: غير محجوزة وغير مستخدَمة وذات صيغة صالحة.
export async function isSlugAvailable(slug) {
  if (!isValidSlug(slug)) return false;
  if (await isSlugReserved(slug)) return false;
  return !(await findOrgBySlug(slug));
}

// اسم قاعدة المستأجر القياسي من الـ slug.
export function dbNameForSlug(slug) {
  return `${tenancyConfig.dbPrefix}${slug}`.replace(/[^a-z0-9_]/g, '_');
}
