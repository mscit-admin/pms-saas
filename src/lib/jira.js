import { jiraConfig, assertJiraConfigured } from './config.js';

// عميل Jira Cloud — Basic Auth (email + API Token) عبر متغيرات البيئة فقط.
// لا يُستدعى من المتصفح إطلاقاً (CORS + الأسرار) — الخلفية حصراً.

function authHeader() {
  const raw = `${jiraConfig.email}:${jiraConfig.apiToken}`;
  const encoded = Buffer.from(raw, 'utf8').toString('base64');
  return `Basic ${encoded}`;
}

// الحقول التي نحتاجها فقط — نقلّل الحمولة
const FIELDS = [
  'summary',
  'status',
  'priority',
  'assignee',
  'reporter',
  'created',
  'updated',
  'duedate',
  'resolutiondate',
  'issuetype',
  'project',
];

async function jiraFetch(path, body) {
  assertJiraConfigured();
  const url = `${jiraConfig.baseUrl}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`فشل طلب جيرا ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

// صفحة واحدة من البحث مع توسعة changelog (لتاريخ الحالات)
async function searchPage(jql, startAt, maxResults) {
  return jiraFetch(jiraConfig.searchPath, {
    jql,
    startAt,
    maxResults,
    fields: FIELDS,
    expand: ['changelog'],
  });
}

// سحب كل التذاكر المطابقة لـ JQL عبر الترقيم (Pagination).
// يستدعي onPage لكل دفعة كي تُعالَج/تُخزَّن تدريجياً بدل تحميل الكل في الذاكرة.
export async function* iterateIssues(jql = jiraConfig.jql, pageSize = jiraConfig.pageSize) {
  let startAt = 0;
  let total = Infinity;

  while (startAt < total) {
    const data = await searchPage(jql, startAt, pageSize);
    total = data.total ?? 0;
    const issues = data.issues ?? [];
    if (issues.length === 0) break;

    yield issues;
    startAt += issues.length;

    // حماية من حلقة لا نهائية لو رجعت جيرا صفحة فارغة بشكل غير متوقع
    if (data.maxResults && issues.length < data.maxResults && startAt >= total) break;
  }
}

// اختبار سريع للاتصال — يُستخدم في /api/health
export async function ping() {
  assertJiraConfigured();
  const res = await fetch(`${jiraConfig.baseUrl}/rest/api/3/myself`, {
    headers: { Authorization: authHeader(), Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`تعذّر الاتصال بجيرا: ${res.status} ${res.statusText}`);
  return res.json();
}
