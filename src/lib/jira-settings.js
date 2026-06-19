import { getAllSettings, setSetting } from './settings.js';

// إعدادات الربط بجيرا: المصدر قاعدة البيانات (app_settings) مع متغيرات البيئة كبديل.
// تتيح إعادة توجيه التطبيق لمشروع/موقع جيرا آخر من الواجهة دون لمس البيئة.

function int(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }

export async function getJiraSettings() {
  const s = await getAllSettings();
  return {
    baseUrl: (s.jira_base_url || process.env.JIRA_BASE_URL || '').replace(/\/+$/, ''),
    email: s.jira_email || process.env.JIRA_EMAIL || '',
    apiToken: s.jira_api_token || process.env.JIRA_API_TOKEN || '',
    jql: s.jira_jql || process.env.JIRA_JQL || 'ORDER BY updated DESC',
    searchPath: s.jira_search_path || process.env.JIRA_SEARCH_PATH || '/rest/api/3/search/jql',
    pageSize: int(s.jira_page_size, int(process.env.JIRA_PAGE_SIZE, 100)),
  };
}

const KEYS = {
  baseUrl: 'jira_base_url',
  email: 'jira_email',
  apiToken: 'jira_api_token',
  jql: 'jira_jql',
  searchPath: 'jira_search_path',
  pageSize: 'jira_page_size',
};

// حفظ الإعدادات المقدّمة فقط (التوكن يُحدَّث فقط عند إرسال قيمة جديدة).
export async function saveJiraSettings(input) {
  for (const [field, key] of Object.entries(KEYS)) {
    if (input[field] === undefined || input[field] === null) continue;
    if (field === 'apiToken' && String(input[field]).trim() === '') continue; // لا تمسح التوكن بالفراغ
    if (field === 'baseUrl') {
      await setSetting(key, String(input[field]).replace(/\/+$/, ''));
    } else {
      await setSetting(key, String(input[field]));
    }
  }
}

export function assertJira(settings) {
  const missing = [];
  if (!settings.baseUrl) missing.push('baseUrl');
  if (!settings.email) missing.push('email');
  if (!settings.apiToken) missing.push('apiToken');
  if (missing.length) throw new Error(`إعدادات جيرا ناقصة: ${missing.join(', ')}`);
}
