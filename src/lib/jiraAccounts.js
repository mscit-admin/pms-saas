import { query } from './db.js';
import { getJiraSettings } from './jira-settings.js';

// تعدّد حسابات جيرا: لكل حساب اعتماداته الخاصة، ويُربط بشركة أو عدّة شركات.
// المشاريع (في جدول projects) تشير إلى الحساب الذي تتبعه، والمستخدمون يُسنَدون للمشاريع.

const int = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };

// تحويل صف الحساب إلى كائن إعدادات يفهمه عميل جيرا.
function toSettings(r) {
  return {
    id: Number(r.id),
    label: r.label,
    baseUrl: (r.base_url || '').replace(/\/+$/, ''),
    email: r.email || '',
    apiToken: r.api_token || '',
    jql: r.jql || 'ORDER BY updated DESC',
    searchPath: r.search_path || '/rest/api/3/search/jql',
    pageSize: int(r.page_size, 100),
    isActive: !!r.is_active,
  };
}

// ترحيل الاتصال المفرد القديم إلى حساب #1 عند غياب أي حساب.
export async function ensureDefaultAccount() {
  const [{ c } = { c: 0 }] = await query('SELECT COUNT(*) AS c FROM jira_accounts');
  if (Number(c) > 0) return;
  const s = await getJiraSettings();
  if (!s.baseUrl && !s.email && !s.apiToken) return; // لا اتصال قديم لترحيله
  await query(
    `INSERT INTO jira_accounts (label, base_url, email, api_token, jql, search_path, page_size, is_active)
     VALUES ('الحساب الافتراضي', :b, :e, :t, :j, :p, :ps, 1)`,
    { b: s.baseUrl, e: s.email, t: s.apiToken, j: s.jql, p: s.searchPath, ps: s.pageSize }
  );
}

export async function listAccounts() {
  await ensureDefaultAccount();
  const rows = await query('SELECT * FROM jira_accounts ORDER BY id');
  return rows.map(toSettings);
}

export async function getActiveAccounts() {
  await ensureDefaultAccount();
  const rows = await query('SELECT * FROM jira_accounts WHERE is_active = 1 ORDER BY id');
  return rows.map(toSettings);
}

export async function getAccount(id) {
  const rows = await query('SELECT * FROM jira_accounts WHERE id = :id', { id });
  return rows[0] ? toSettings(rows[0]) : null;
}

// حساب افتراضي للطلبات غير المرتبطة بتذكرة (أول حساب نشط).
export async function defaultJiraAccount() {
  const accts = await getActiveAccounts();
  if (accts.length) return accts[0];
  // احتياط: الإعدادات القديمة مباشرة
  return getJiraSettings();
}

// حساب التذكرة (من account_id المخزّن) — لعمليات الكتابة على التذكرة بالحساب الصحيح.
export async function accountForIssueKey(idOrKey) {
  const rows = await query(
    `SELECT a.* FROM tickets t JOIN jira_accounts a ON a.id = t.account_id
     WHERE t.issue_key = :k OR t.id = :idn LIMIT 1`,
    { k: String(idOrKey), idn: int(idOrKey, -1) }
  );
  if (rows[0]) return toSettings(rows[0]);
  return defaultJiraAccount();
}

export async function createAccount(input) {
  const label = String(input.label || '').trim();
  if (!label) throw new Error('اسم الحساب مطلوب');
  const res = await query(
    `INSERT INTO jira_accounts (label, base_url, email, api_token, jql, search_path, page_size, is_active)
     VALUES (:label, :b, :e, :t, :j, :p, :ps, :act)`,
    {
      label,
      b: String(input.baseUrl || '').replace(/\/+$/, ''),
      e: String(input.email || ''),
      t: String(input.apiToken || ''),
      j: input.jql ? String(input.jql) : 'ORDER BY updated DESC',
      p: input.searchPath ? String(input.searchPath) : '/rest/api/3/search/jql',
      ps: int(input.pageSize, 100),
      act: input.isActive === false ? 0 : 1,
    }
  );
  return { id: res.insertId, label };
}

export async function updateAccount(id, input) {
  const fields = { label: 'label', baseUrl: 'base_url', email: 'email', jql: 'jql', searchPath: 'search_path' };
  const sets = [];
  const params = { id };
  for (const [k, col] of Object.entries(fields)) {
    if (input[k] !== undefined) {
      sets.push(`${col} = :${k}`);
      params[k] = k === 'baseUrl' ? String(input[k]).replace(/\/+$/, '') : String(input[k]);
    }
  }
  if (input.pageSize !== undefined) { sets.push('page_size = :ps'); params.ps = int(input.pageSize, 100); }
  if (input.isActive !== undefined) { sets.push('is_active = :act'); params.act = input.isActive ? 1 : 0; }
  // التوكن: يُحدَّث فقط عند إرسال قيمة غير فارغة
  if (input.apiToken !== undefined && String(input.apiToken).trim() !== '') {
    sets.push('api_token = :tok'); params.tok = String(input.apiToken);
  }
  if (sets.length) await query(`UPDATE jira_accounts SET ${sets.join(', ')} WHERE id = :id`, params);
}

export async function deleteAccount(id) {
  await query('DELETE FROM jira_accounts WHERE id = :id', { id });
}

// ---- ربط الحساب بالشركات (many-to-many) ----
export async function getAccountCompanies(accountId) {
  const rows = await query('SELECT company_id FROM company_jira_accounts WHERE account_id = :a', { a: accountId });
  return rows.map((r) => Number(r.company_id));
}

export async function setAccountCompanies(accountId, companyIds) {
  await query('DELETE FROM company_jira_accounts WHERE account_id = :a', { a: accountId });
  for (const cid of companyIds || []) {
    await query('INSERT IGNORE INTO company_jira_accounts (company_id, account_id) VALUES (:c, :a)', { c: cid, a: accountId });
  }
}

// شركات يسمح لها حساب معيّن (لتقييد اختيار الحساب عند إنشاء مشروع تحت شركة).
export async function getCompanyAccountIds(companyId) {
  const rows = await query('SELECT account_id FROM company_jira_accounts WHERE company_id = :c', { c: companyId });
  return rows.map((r) => Number(r.account_id));
}
