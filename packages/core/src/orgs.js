// إدارة المنظمات من مستوى التحكّم (للوحة المشرف الأعلى):
// سرد/تفصيل/تحديث (حالة، خطة، حصص، وحدات)/حذف، وفرض الحصص والوحدات.
import mysql from 'mysql2/promise';
import { dbConfig } from './config.js';
import { controlQuery } from './control-db.js';
import { query } from './db.js';
import { runInTenant, findOrgBySlug } from './tenancy.js';
import { closeTenantPool } from './db.js';

// كتالوج الوحدات القابلة للتفعيل لكل مستأجر (المفتاح: الافتراضي).
export const FEATURE_KEYS = {
  analytics: true,      // التحليلات الإدارية
  dependencies: true,   // الاعتماديات
  ai: false,            // الذكاء الاصطناعي (تعليقات مقترحة)
  multiJira: true,      // تعدّد حسابات جيرا
  alerts: true,         // التنبيهات
};

export function defaultFeatures() {
  return { ...FEATURE_KEYS };
}

// تطبيع حقل features (قد يأتي JSON من MySQL ككائن أو نصّ).
function parseFeatures(raw) {
  if (!raw) return defaultFeatures();
  let obj = raw;
  if (typeof raw === 'string') { try { obj = JSON.parse(raw); } catch { obj = {}; } }
  return { ...defaultFeatures(), ...obj };
}

const SELECT_COLS = `id, name, slug, db_name AS dbName, status, plan,
  max_users AS maxUsers, max_projects AS maxProjects,
  sync_interval_minutes AS syncIntervalMinutes, features, created_at AS createdAt`;

function shape(row) {
  if (!row) return null;
  return { ...row, features: parseFeatures(row.features) };
}

// سرد كل المنظمات (سريع — من قاعدة التحكّم فقط).
export async function listOrgs() {
  const rows = await controlQuery(`SELECT ${SELECT_COLS} FROM organizations ORDER BY id`);
  return rows.map(shape);
}

// إحصاءات لوحة المعلومات: عدّ المستأجرين والخطط + مجموع المستخدمين/المشاريع
// عبر كل قاعدة مستأجر نشط (عدد المستأجرين صغير عادةً).
export async function overviewStats() {
  const orgs = await listOrgs();
  const byStatus = {};
  const byPlan = {};
  for (const o of orgs) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    byPlan[o.plan] = (byPlan[o.plan] || 0) + 1;
  }
  let users = 0;
  let projects = 0;
  for (const o of orgs.filter((x) => x.status === 'active')) {
    try {
      const r = await runInTenant({ slug: o.slug, dbName: o.dbName }, async () => {
        const [u] = await query('SELECT COUNT(*) AS n FROM users');
        const [p] = await query('SELECT COUNT(*) AS n FROM projects');
        return { u: u.n, p: p.n };
      });
      users += r.u; projects += r.p;
    } catch { /* قاعدة غير جاهزة */ }
  }
  return { total: orgs.length, byStatus, byPlan, users, projects };
}

// تفصيل منظمة + إحصاءات حيّة من قاعدتها (عدد المستخدمين/المشاريع).
export async function getOrgDetail(slug) {
  const rows = await controlQuery(`SELECT ${SELECT_COLS} FROM organizations WHERE slug = :slug`, { slug });
  const org = shape(rows[0]);
  if (!org) return null;
  let stats = { users: null, projects: null };
  if (org.status === 'active') {
    try {
      stats = await runInTenant({ slug: org.slug, dbName: org.dbName }, async () => {
        const [u] = await query('SELECT COUNT(*) AS n FROM users');
        const [p] = await query('SELECT COUNT(*) AS n FROM projects');
        return { users: u.n, projects: p.n };
      });
    } catch { /* قاعدة غير جاهزة بعد */ }
  }
  return { ...org, stats };
}

// تحديث حقول مسموحة فقط (حالة/خطة/حصص/وحدات).
export async function updateOrg(slug, patch = {}) {
  const sets = [];
  const params = { slug };
  const allow = {
    name: 'name', status: 'status', plan: 'plan',
    maxUsers: 'max_users', maxProjects: 'max_projects',
    syncIntervalMinutes: 'sync_interval_minutes',
  };
  for (const [k, col] of Object.entries(allow)) {
    if (patch[k] !== undefined) { sets.push(`${col} = :${k}`); params[k] = patch[k]; }
  }
  if (patch.features !== undefined) {
    sets.push('features = :features');
    params.features = JSON.stringify({ ...defaultFeatures(), ...patch.features });
  }
  if (!sets.length) return getOrgDetail(slug);
  await controlQuery(`UPDATE organizations SET ${sets.join(', ')} WHERE slug = :slug`, params);
  return getOrgDetail(slug);
}

// حذف منظمة: إسقاط قاعدتها + حذف صفّها + إغلاق تجمّعها. مدمّر — يتطلّب اسماً آمناً.
export async function deleteOrg(slug) {
  const org = await findOrgBySlug(slug);
  if (!org) return false;
  const dbName = org.dbName;
  if (!/^[a-z0-9_]+$/.test(dbName)) throw new Error(`اسم قاعدة غير آمن: ${dbName}`);
  const admin = await mysql.createConnection({
    host: dbConfig.host, port: dbConfig.port, user: dbConfig.user, password: dbConfig.password,
    charset: 'utf8mb4',
  });
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  } finally {
    await admin.end();
  }
  await controlQuery('DELETE FROM organizations WHERE slug = :slug', { slug });
  await closeTenantPool(dbName);
  return true;
}

// ---- فرض الحصص والوحدات (تُستدعى من مسارات المستأجر) ----
export class QuotaError extends Error {
  constructor(message) { super(message); this.status = 403; }
}

// حدّ المنظمة الحالية من قاعدة التحكّم (يُمرَّر slug من سياق المستأجر).
async function orgLimits(slug) {
  const rows = await controlQuery(
    `SELECT max_users AS maxUsers, max_projects AS maxProjects, features
       FROM organizations WHERE slug = :slug`,
    { slug }
  );
  const r = rows[0] || {};
  return { maxUsers: r.maxUsers, maxProjects: r.maxProjects, features: parseFeatures(r.features) };
}

// يرمي QuotaError إن بلغت المنظمة حدّ المستخدمين. يُستدعى داخل سياق المستأجر.
export async function assertUserQuota(slug) {
  const { maxUsers } = await orgLimits(slug);
  if (maxUsers == null) return;
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM users');
  if (n >= maxUsers) throw new QuotaError(`بلغت المنظمة حدّ المستخدمين (${maxUsers}).`);
}

export async function assertProjectQuota(slug) {
  const { maxProjects } = await orgLimits(slug);
  if (maxProjects == null) return;
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM projects');
  if (n >= maxProjects) throw new QuotaError(`بلغت المنظمة حدّ المشاريع (${maxProjects}).`);
}

// هل الوحدة مفعّلة للمنظمة؟ (للحجب الاختياري للمسارات/الواجهة)
export async function featureEnabled(slug, key) {
  const { features } = await orgLimits(slug);
  return features[key] !== false;
}

export async function requireFeature(slug, key) {
  if (!(await featureEnabled(slug, key))) {
    throw new QuotaError('هذه الميزة غير مُفعّلة لمنظمتك.');
  }
}
