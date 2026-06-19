import { jiraConfig, assertJiraConfigured } from './config.js';

// عميل Jira Cloud — Basic Auth (email + API Token) عبر متغيرات البيئة فقط.
// لا يُستدعى من المتصفح إطلاقاً (CORS + الأسرار) — الخلفية حصراً.
//
// نستخدم نقطة /rest/api/3/search/jql الجديدة (القديمة /search أُزيلت — 410 Gone).
// الترقيم بالرمز nextPageToken بدل startAt. والـ changelog يُجلب من نقطته المخصّصة
// عند الحاجة لأن نقطة البحث الجديدة قد لا تُرجعه.

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

async function jiraRequest(method, path, body) {
  assertJiraConfigured();
  const url = `${jiraConfig.baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`فشل طلب جيرا ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

// صفحة واحدة من نقطة البحث الجديدة. expand=changelog كمحاولة أولى (مدعومة أحياناً).
async function searchPage(jql, nextPageToken, maxResults) {
  const body = {
    jql,
    maxResults,
    fields: FIELDS,
    expand: 'changelog',
  };
  if (nextPageToken) body.nextPageToken = nextPageToken;
  return jiraRequest('POST', jiraConfig.searchPath, body);
}

// يجلب سجلّ تغييرات تذكرة من النقطة المخصّصة (مرقّمة) — احتياط حين لا يرجعها البحث.
// شكل القيم value يطابق histories: { id, created, author, items }.
export async function fetchChangelog(issueIdOrKey) {
  const histories = [];
  let startAt = 0;
  // حلقة ترقيم كلاسيكية — هذه النقطة ما زالت تستخدم startAt
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await jiraRequest(
      'GET',
      `/rest/api/3/issue/${issueIdOrKey}/changelog?startAt=${startAt}&maxResults=100`
    );
    const values = data.values || [];
    histories.push(...values);
    if (data.isLast || values.length === 0) break;
    startAt += values.length;
    if (data.total != null && startAt >= data.total) break;
  }
  return { histories };
}

// سحب كل التذاكر المطابقة لـ JQL عبر الترقيم بالرمز (nextPageToken).
export async function* iterateIssues(jql = jiraConfig.jql, pageSize = jiraConfig.pageSize) {
  let nextPageToken;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await searchPage(jql, nextPageToken, pageSize);
    const issues = data.issues ?? [];
    if (issues.length > 0) yield issues;

    nextPageToken = data.nextPageToken;
    if (!nextPageToken || data.isLast) break;
  }
}

// جلب تذكرة واحدة بحقولها وتاريخها — يُستخدم في معالج Webhook.
export async function getIssue(idOrKey) {
  const path = `/rest/api/3/issue/${encodeURIComponent(idOrKey)}?fields=${FIELDS.join(',')}&expand=changelog`;
  return jiraRequest('GET', path);
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
