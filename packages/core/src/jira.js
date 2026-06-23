import { assertJira } from './jira-settings.js';
import { defaultJiraAccount, accountForIssueKey } from './jiraAccounts.js';
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
  'comment',
];

async function jiraRequest(method, path, body, account) {
  const settings = account || await defaultJiraAccount();
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
async function searchPage(jql, nextPageToken, maxResults, account) {
  const body = {
    jql,
    maxResults,
    fields: FIELDS,
    expand: 'changelog',
  };
  if (nextPageToken) body.nextPageToken = nextPageToken;
  return jiraRequest('POST', account?.searchPath || '/rest/api/3/search/jql', body, account);
}

// يجلب سجلّ تغييرات تذكرة من النقطة المخصّصة (مرقّمة) — احتياط حين لا يرجعها البحث.
// شكل القيم value يطابق histories: { id, created, author, items }.
export async function fetchChangelog(issueIdOrKey, account) {
  const histories = [];
  let startAt = 0;
  // حلقة ترقيم كلاسيكية — هذه النقطة ما زالت تستخدم startAt
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await jiraRequest(
      'GET',
      `/rest/api/3/issue/${issueIdOrKey}/changelog?startAt=${startAt}&maxResults=100`,
      undefined,
      account
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
// يُمرَّر account (حساب جيرا) لتحديد الاعتمادات و JQL/حجم الصفحة الخاصّين به.
export async function* iterateIssues(jql, pageSize, account) {
  const acct = account || await defaultJiraAccount();
  if (jql === undefined) jql = acct.jql;
  if (pageSize === undefined) pageSize = acct.pageSize;
  let nextPageToken;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await searchPage(jql, nextPageToken, pageSize, acct);
    const issues = data.issues ?? [];
    if (issues.length > 0) yield issues;

    nextPageToken = data.nextPageToken;
    if (!nextPageToken || data.isLast) break;
  }
}

// جلب تذكرة واحدة بحقولها وتاريخها — يُستخدم في معالج Webhook.
export async function getIssue(idOrKey, account) {
  const path = `/rest/api/3/issue/${encodeURIComponent(idOrKey)}?fields=${FIELDS.join(',')}&expand=changelog`;
  return jiraRequest('GET', path, undefined, account);
}

// ---- عمليات الكتابة في جيرا (Write-back) ----

// إسناد تذكرة (accountId=null لإلغاء الإسناد)
export async function assignIssue(idOrKey, accountId) {
  const acct = await accountForIssueKey(idOrKey);
  return jiraRequest('PUT', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/assignee`, {
    accountId: accountId || null,
  }, acct);
}

// إضافة تعليق (يدعم الإشارات @ عبر بناء ADF مع عقد mention)
export async function addComment(idOrKey, text, mentions = []) {
  const acct = await accountForIssueKey(idOrKey);
  return jiraRequest('POST', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/comment`, {
    body: textToAdf(text, mentions),
  }, acct);
}

// إنشاء رابط بين تذكرتين (Blocks). الدلالة: outwardIssue «يحجب» inwardIssue.
export async function createIssueLink({ type = 'Blocks', inwardKey, outwardKey }) {
  const acct = await accountForIssueKey(outwardKey || inwardKey);
  return jiraRequest('POST', '/rest/api/3/issueLink', {
    type: { name: type },
    inwardIssue: { key: inwardKey },
    outwardIssue: { key: outwardKey },
  }, acct);
}

// حذف رابط بين تذكرتين بمعرّفه (issueLink id). يُمرَّر مفتاح تذكرة لتحديد الحساب.
export async function deleteIssueLink(linkId, contextKey) {
  const acct = contextKey ? await accountForIssueKey(contextKey) : await defaultJiraAccount();
  return jiraRequest('DELETE', `/rest/api/3/issueLink/${encodeURIComponent(linkId)}`, undefined, acct);
}

// جلب روابط تذكرة (issuelinks) فقط — لعرض/حذف الاعتماديات الحالية.
export async function getIssueLinks(idOrKey) {
  const acct = await accountForIssueKey(idOrKey);
  return jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}?fields=issuelinks`, undefined, acct);
}

// بحث مستخدمي جيرا (للإشارات @) — حسب نص الاستعلام. account اختياري (حساب التذكرة).
export async function searchUsers(q, account) {
  const data = await jiraRequest('GET', `/rest/api/3/user/search?query=${encodeURIComponent(q || '')}&maxResults=10`, undefined, account);
  return (data || [])
    .filter((u) => u.accountType !== 'app' && u.active !== false)
    .map((u) => ({ accountId: u.accountId, name: u.displayName }));
}

// بيانات تعديل حقول التذكرة (editmeta) — لمعرفة الحقول وقيمها المسموحة
export async function getEditMeta(idOrKey) {
  const acct = await accountForIssueKey(idOrKey);
  return jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/editmeta`, undefined, acct);
}

// تحديث حقول التذكرة (لضبط مثل labels/priority قبل انتقال يتطلبها validator)
export async function updateIssueFields(idOrKey, fields) {
  const acct = await accountForIssueKey(idOrKey);
  return jiraRequest('PUT', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}`, { fields }, acct);
}

// الانتقالات المتاحة لتذكرة (مع حقولها لاكتشاف الإلزامي منها)
export async function getTransitions(idOrKey) {
  const acct = await accountForIssueKey(idOrKey);
  return jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/transitions?expand=transitions.fields`, undefined, acct);
}

// تنفيذ انتقال حالة (مع حقول الشاشة الإلزامية إن وُجدت)
export async function transitionIssue(idOrKey, transitionId, fields) {
  const acct = await accountForIssueKey(idOrKey);
  const body = { transition: { id: String(transitionId) } };
  if (fields && Object.keys(fields).length > 0) body.fields = fields;
  return jiraRequest('POST', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/transitions`, body, acct);
}

// تفاصيل إضافية للتاريخ: المهام الفرعية + سجل التغييرات الكامل.
export async function getIssueExtra(idOrKey) {
  const acct = await accountForIssueKey(idOrKey);
  return jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}?fields=subtasks,parent&expand=changelog`, undefined, acct);
}

// تعليقات التذكرة (مرقّمة، الأحدث أولاً).
export async function getComments(idOrKey, startAt = 0, maxResults = 30) {
  const acct = await accountForIssueKey(idOrKey);
  return jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}/comment?startAt=${startAt}&maxResults=${maxResults}&orderBy=-created`, undefined, acct);
}

// ---- التسلسل الهرمي (Epic → Task → Subtask) ----
const HIER_FIELDS = ['summary', 'status', 'assignee', 'priority', 'issuetype', 'parent', 'subtasks', 'created', 'reporter', 'duedate'];

// تذكرة مختصرة بحقول التسلسل.
export async function getIssueBrief(idOrKey, account) {
  return jiraRequest('GET', `/rest/api/3/issue/${encodeURIComponent(idOrKey)}?fields=${HIER_FIELDS.join(',')}`, undefined, account);
}

// أبناء تذكرة: عبر parent دائماً، وللـ Epic نجرّب «Epic Link» أيضاً (مشاريع كلاسيكية).
export async function searchChildren(parentKey, isEpic, account) {
  const searchPath = account?.searchPath || '/rest/api/3/search/jql';
  const results = [];
  const seen = new Set();
  const addAll = (data) => {
    for (const i of data?.issues || []) {
      if (!seen.has(i.key)) { seen.add(i.key); results.push(i); }
    }
  };
  try {
    addAll(await jiraRequest('POST', searchPath, { jql: `parent = "${parentKey}"`, maxResults: 100, fields: HIER_FIELDS }, account));
  } catch { /* تجاهل */ }
  if (isEpic) {
    try {
      addAll(await jiraRequest('POST', searchPath, { jql: `"Epic Link" = "${parentKey}"`, maxResults: 100, fields: HIER_FIELDS }, account));
    } catch { /* الحقل غير موجود في بعض المواقع */ }
  }
  return results;
}

// اختبار سريع للاتصال — يُستخدم في /api/health وزر اختبار الربط.
// يقبل إعدادات اختيارية لاختبار اتصال قبل حفظه.
export async function ping(override) {
  const settings = override || (await defaultJiraAccount());
  assertJira(settings);
  const res = await fetch(`${settings.baseUrl}/rest/api/3/myself`, {
    headers: { Authorization: authHeader(settings), Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`تعذّر الاتصال بجيرا: ${res.status} ${res.statusText}`);
  return res.json();
}
