import { query } from './db.js';

// إدارة الشركات/المشاريع وإسناد المستخدمين + حساب نطاق المستخدم (عزل البيانات).

// ---- الشركات ----
export async function listCompanies() {
  const companies = await query('SELECT id, name FROM companies ORDER BY name');
  const projects = await query(
    `SELECT p.id, p.company_id, p.name, p.jira_key, p.account_id, a.label AS account_label
     FROM projects p LEFT JOIN jira_accounts a ON a.id = p.account_id ORDER BY p.name`
  );
  const byCompany = new Map(companies.map((c) => [c.id, { id: c.id, name: c.name, projects: [] }]));
  for (const p of projects) {
    const c = byCompany.get(p.company_id);
    if (c) c.projects.push({ id: p.id, name: p.name, jiraKey: p.jira_key, accountId: p.account_id ? Number(p.account_id) : null, accountLabel: p.account_label || null });
  }
  return Array.from(byCompany.values());
}

export async function createCompany(name) {
  const n = String(name || '').trim();
  if (!n) throw new Error('اسم الشركة مطلوب');
  const res = await query('INSERT INTO companies (name) VALUES (:n)', { n });
  return { id: res.insertId, name: n };
}

export async function renameCompany(id, name) {
  const n = String(name || '').trim();
  if (!n) throw new Error('اسم الشركة مطلوب');
  await query('UPDATE companies SET name = :n WHERE id = :id', { n, id });
}

export async function deleteCompany(id) {
  await query('DELETE FROM companies WHERE id = :id', { id }); // يحذف مشاريعها (CASCADE)
}

// ---- المشاريع ----
export async function createProject(companyId, name, jiraKey, accountId = null) {
  const n = String(name || '').trim();
  const k = String(jiraKey || '').trim().toUpperCase();
  if (!n) throw new Error('اسم المشروع مطلوب');
  if (!k) throw new Error('مفتاح مشروع جيرا مطلوب');
  const res = await query(
    'INSERT INTO projects (company_id, name, jira_key, account_id) VALUES (:c, :n, :k, :a)',
    { c: companyId, n, k, a: accountId || null }
  );
  return { id: res.insertId, name: n, jiraKey: k, accountId: accountId || null };
}

export async function deleteProject(id) {
  await query('DELETE FROM projects WHERE id = :id', { id });
}

// ---- إسناد المستخدمين للمشاريع ----
export async function getProjectMembers(projectId) {
  const rows = await query('SELECT user_id FROM user_projects WHERE project_id = :p', { p: projectId });
  return rows.map((r) => Number(r.user_id));
}

export async function setUserProjects(userId, projectIds) {
  await query('DELETE FROM user_projects WHERE user_id = :u', { u: userId });
  for (const pid of projectIds || []) {
    await query('INSERT IGNORE INTO user_projects (user_id, project_id) VALUES (:u, :p)', { u: userId, p: pid });
  }
}

export async function getUserProjectIds(userId) {
  const rows = await query('SELECT project_id FROM user_projects WHERE user_id = :u', { u: userId });
  return rows.map((r) => Number(r.project_id));
}

// قائمة مختصرة بالمستخدمين النشطين — لواجهة الإسناد (لمن يملك manage_companies).
export async function listUsersBrief() {
  const rows = await query(
    "SELECT id, full_name, username FROM users WHERE is_active = 1 ORDER BY full_name, username"
  );
  return rows.map((r) => ({ id: Number(r.id), name: r.full_name || r.username, username: r.username }));
}

// ---- نطاق العزل ----
// إن لم يُعرَّف أي مشروع بعد → النظام غير مُهيّأ للعزل ⇒ بلا تقييد (تفادي حجب الجميع).
// غير ذلك → المستخدم يُقيَّد بمفاتيح جيرا لمشاريعه المُسنَدة (قد تكون فارغة ⇒ لا يرى شيئاً).
export async function getUserScope(userId) {
  const [{ c } = { c: 0 }] = await query('SELECT COUNT(*) AS c FROM projects');
  if (Number(c) === 0) return { unrestricted: true, keys: [] };
  const rows = await query(
    `SELECT p.jira_key AS k FROM user_projects up
     JOIN projects p ON p.id = up.project_id WHERE up.user_id = :u`,
    { u: userId }
  );
  return { unrestricted: false, keys: rows.map((r) => r.k) };
}

// جزء SQL لتقييد النطاق. alias: اسم جدول التذاكر (مثل 't' أو 'tb')، أو '' لاستخدام العمود مباشرة.
// يبدأ بـ ' AND '؛ يعيد '' عند عدم التقييد، و' AND 1=0' عند غياب أي مشروع مُسنَد.
export function scopeAnd(scope, alias = 't') {
  if (!scope || scope.unrestricted) return { sql: '', params: {} };
  const keys = scope.keys || [];
  if (keys.length === 0) return { sql: ' AND 1=0', params: {} };
  const col = alias ? `${alias}.project_key` : 'project_key';
  const params = {};
  const ph = keys.map((k, i) => { params[`sk${i}`] = k; return `:sk${i}`; });
  return { sql: ` AND ${col} IN (${ph.join(',')})`, params };
}
