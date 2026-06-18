// قراءة الإعدادات من متغيرات البيئة في مكان واحد، مع قيم افتراضية معقولة.
// لا تُقرأ الأسرار في أي مكان آخر — كله يمرّ من هنا.

function int(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const jiraConfig = {
  baseUrl: (process.env.JIRA_BASE_URL || '').replace(/\/+$/, ''),
  email: process.env.JIRA_EMAIL || '',
  apiToken: process.env.JIRA_API_TOKEN || '',
  jql: process.env.JIRA_JQL || 'ORDER BY updated DESC',
  searchPath: process.env.JIRA_SEARCH_PATH || '/rest/api/3/search',
  pageSize: int(process.env.JIRA_PAGE_SIZE, 100),
};

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: int(process.env.DB_PORT, 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jira_monitor',
  connectionLimit: int(process.env.DB_CONNECTION_LIMIT, 10),
};

export const syncConfig = {
  intervalMinutes: int(process.env.SYNC_INTERVAL_MINUTES, 5),
  secret: process.env.SYNC_SECRET || '',
};

// قواعد الاستثناء (أيام) — نفس منطق الواجهة، قابلة للضبط
export const ruleConfig = {
  stagnantDays: int(process.env.RULE_STAGNANT_DAYS, 3),
  reviewDays: int(process.env.RULE_REVIEW_DAYS, 2),
};

// قيم SLA البذرية (تُستخدم فقط لو الجدول فارغ)
export const slaSeed = {
  High: int(process.env.SLA_HIGH_DAYS, 7),
  Medium: int(process.env.SLA_MEDIUM_DAYS, 14),
  Low: int(process.env.SLA_LOW_DAYS, 21),
};

// تأكيد وجود الإعدادات الحرجة قبل محاولة الاتصال بجيرا
export function assertJiraConfigured() {
  const missing = [];
  if (!jiraConfig.baseUrl) missing.push('JIRA_BASE_URL');
  if (!jiraConfig.email) missing.push('JIRA_EMAIL');
  if (!jiraConfig.apiToken) missing.push('JIRA_API_TOKEN');
  if (missing.length) {
    throw new Error(`إعدادات جيرا ناقصة: ${missing.join(', ')}`);
  }
}
