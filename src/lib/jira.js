import { getJiraSettings, assertJira } from './jira-settings.js';
import { textToAdf } from './adf.js';

// عميل Jira Cloud — Basic Auth (email + API Token). الإعدادات من قاعدة البيانات
// (قابلة للتعديل من الواجهة) مع متغيرات البيئة كبديل. لا يُستدعى من المتصفح.
//
// نستخدم نقطة /rest/api/3/search/jql الجديدة (القديمة /search أُزيلت — 410 Gone).
// الترقيم بالرمز nextPageToken بدل startAt. والـ changelog يُجلب من نقطته المخصّصة
// عند الحاجة لأن نقطة البحث الجديدة قد لا تُرجعه.

function authHeader(settings) {
  const raw = `${settings.email}:${settings.apiToken}`;
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
  'labels',
  'issuelinks',
];

async function jiraRequest(method, path, body) {
  const settings = await getJiraSettings();
  assertJira(settings);
  const url = `${settings.baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(settings),
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`فشل طلب جيرا ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  }
  // بعض نقاط الكتابة (الإسناد/الانتقال) تُرجع 204 بلا محتوى — تفادَ JSON على جسم فارغ
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// صفحة واحدة من نقطة البحث الجديدة. expand=changelog كمحاولة أولى (مدعومة أحياناً).
async function searchPage(jql, nextPageToken, maxResults) {
  const settings = await getJiraSettings();
  const body = {
    jql,
    maxResults,
    fields: FIELDS,
    expand: 'changelog',
  };
  if (nextPageToken) body.nextPageToken = nextPageToken;
  return jiraRequest('POST', settings.searchPath, body);
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
// عند عدم تمرير jql/pageSize نقرأهما من الإعدادات (قاعدة البيانات/البيئة).
export async function* iterateIssues(jql, pageSize) {
  if (jql === undefined || pageSize === undefined) {
    const s = await getJiraSettings();
    if (jql === undefined) jql = s.jql;
    if (pageSize === undefined) pageSize = s.pageSize;
  }
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

// ---- عمليات الكتابة في جيرا (Write-back) ----

// إسناد تذكرة (accountId=null لإلغاء الإسناد)
export async function assignIssue(idOrKey, accountId) {
  return jiraRequest('PUT', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/assignee`, {
    accountId: accountId || null,
  });
}

// إضافة تعليق (يدعم الإشارات @ عبر بناء ADF مع عقد mention)
export async function addComment(idOrKey, text, mentions = []) {
  return jiraRequest('POST', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/comment`, {
    body: textToAdf(text, mentions),
  });
}

// بحث مستخدمي جيرا (للإشارات @) — حسب نص الاستعلام.
export async function searchUsers(q) {
  const data = await jiraRequest('GET', `/rest/api/3/user/search?query=${encodeURIComponent(q || '')}&maxResults=10`);
  return (data || [])
    .filter((u) => u.accountType !== 'app' && u.active !== false)
    .map((u) => ({ accountId: u.accountId, name: u.displayName }));
}

// بيانات تعديل حقول التذكرة (editmeta) — لمعرفة الحقول وقيمها المسموحة
export async function getEditMeta(idOrKey) {
  return jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/editmeta`);
}

// تحديث حقول التذكرة (لضبط مثل labels/priority قبل انتقال يتطلبها validator)
export async function updateIssueFields(idOrKey, fields) {
  return jiraRequest('PUT', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}`, { fields });
}

// الانتقالات المتاحة لتذكرة (مع حقولها لاكتشاف الإلزامي منها)
export async function getTransitions(idOrKey) {
  return jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/transitions?expand=transitions.fields`);
}

// تنفيذ انتقال حالة (مع حقول الشاشة الإلزامية إن وُجدت)
export async function transitionIssue(idOrKey, transitionId, fields) {
  const body = { transition: { id: String(transitionId) } };
  if (fields && Object.keys(fields).length > 0) body.fields = fields;
  return jiraRequest('POST', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/transitions`, body);
}

// تفاصيل إضافية للتاريخ: المهام الفرعية + سجل التغييرات الكامل.
export async function getIssueExtra(idOrKey) {
  return jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}?fields=subtasks,parent&expand=changelog`);
}

// تعليقات التذكرة (مرقّمة، الأحدث أولاً).
export async function getComments(idOrKey, startAt = 0, maxResults = 30) {
  return jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/comment?startAt=${startAt}&maxResults=${maxResults}&orderBy=-created`);
}

// اختبار سريع للاتصال — يُستخدم في /api/health وزر اختبار الربط.
// يقبل إعدادات اختيارية لاختبار اتصال قبل حفظه.
export async function ping(override) {
  const settings = override || (await getJiraSettings());
  assertJira(settings);
  const res = await fetch(`${settings.baseUrl}/rest/api/3/myself`, {
    headers: { Authorization: authHeader(settings), Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`تعذّر الاتصال بجيرا: ${res.status} ${res.statusText}`);
  return res.json();
}
