import { getIssueBrief, searchChildren } from './jira.js';
import { accountForIssueKey } from './jiraAccounts.js';

// بناء شجرة تذكرة نزولاً (Epic → Task → Subtask) مع تفاصيل كل عقدة.

function brief(issue) {
  const f = issue.fields || {};
  return {
    key: issue.key,
    summary: f.summary || '',
    type: f.issuetype?.name || null,
    status: f.status?.name || null,
    statusCategory: f.status?.statusCategory?.key || null,
    assignee: f.assignee?.displayName || null,
    reporter: f.reporter?.displayName || null,
    priority: f.priority?.name || null,
    created: f.created || null,
    due: f.duedate || null,
    children: [],
  };
}

async function addChildren(node, typeName, account, depthLeft, guard) {
  if (depthLeft <= 0) return;
  const isEpic = (typeName || '').toLowerCase().includes('epic');
  const kids = await searchChildren(node.key, isEpic, account);
  for (const k of kids) {
    if (guard.count >= 500 || guard.seen.has(k.key)) continue; // حماية من الدورات/الأحجام الكبيرة
    guard.seen.add(k.key);
    guard.count += 1;
    const child = brief(k);
    node.children.push(child);
    await addChildren(child, k.fields?.issuetype?.name, account, depthLeft - 1, guard);
  }
}

// تُعيد عقدة الجذر (التذكرة المطلوبة) وتحتها الأبناء حتى عمق maxDepth.
export async function getHierarchy(key, maxDepth = 3) {
  const account = await accountForIssueKey(key);
  const root = await getIssueBrief(key, account);
  const node = brief(root);
  const guard = { seen: new Set([key]), count: 0 };
  await addChildren(node, root.fields?.issuetype?.name, account, maxDepth - 1, guard);
  return node;
}
