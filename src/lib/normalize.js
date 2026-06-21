// تطبيع بيانات جيرا الخام إلى شكل صفوف قاعدة البيانات.

// جيرا تعيد تواريخ ISO مثل 2026-06-18T10:20:30.000+0300.
// نحوّلها إلى DATETIME بتوقيت UTC ('YYYY-MM-DD HH:MM:SS') لتخزين متّسق.
export function toMysqlDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function toMysqlDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// نطبّع أولويات جيرا الخمس إلى ثلاث فئات SLA: High / Medium / Low.
// Highest, High → High · Medium → Medium · Low, Lowest → Low.
export function normalizePriority(jiraPriorityName) {
  if (!jiraPriorityName) return 'Medium'; // غياب الأولوية يُعامَل كمتوسطة
  const name = String(jiraPriorityName).toLowerCase();
  if (name.includes('highest') || name.includes('high') || name.includes('critical') || name.includes('blocker')) {
    return 'High';
  }
  if (name.includes('lowest') || name.includes('low') || name.includes('minor') || name.includes('trivial')) {
    return 'Low';
  }
  return 'Medium';
}

// يستخرج صف tickets من كائن issue الخام
export function mapIssueToRow(issue, syncedAt) {
  const f = issue.fields || {};
  const status = f.status || {};
  const category = status.statusCategory || {};
  return {
    id: Number(issue.id),
    issue_key: issue.key,
    project_key: f.project?.key || (issue.key || '').split('-')[0] || '',
    summary: (f.summary || '').slice(0, 1024),
    issue_type: f.issuetype?.name || null,
    status: status.name || 'Unknown',
    // category.key: new | indeterminate | done
    status_category: category.key || 'new',
    priority: normalizePriority(f.priority?.name),
    assignee_account_id: f.assignee?.accountId || null,
    assignee_name: f.assignee?.displayName || null,
    reporter_account_id: f.reporter?.accountId || null,
    reporter_name: f.reporter?.displayName || null,
    // وسوم جيرا (labels): لا تحوي مسافات أو فواصل، فنخزّنها كسلسلة مفصولة بفواصل
    labels: Array.isArray(f.labels) && f.labels.length ? f.labels.join(',').slice(0, 1024) : null,
    jira_created_at: toMysqlDateTime(f.created),
    jira_updated_at: toMysqlDateTime(f.updated),
    due_date: toMysqlDate(f.duedate),
    resolved_at: toMysqlDateTime(f.resolutiondate),
    synced_at: syncedAt,
  };
}

// يستخرج صفوف تغيّر الحالة من changelog التذكرة.
// كل history قد يحوي عدة items؛ نهتم فقط بـ field === 'status'.
export function extractStatusChanges(issue) {
  const histories = issue.changelog?.histories || [];
  const changes = [];
  for (const h of histories) {
    const items = h.items || [];
    for (const item of items) {
      if (item.field !== 'status' && item.fieldId !== 'status') continue;
      changes.push({
        change_id: Number(h.id),
        issue_id: Number(issue.id),
        issue_key: issue.key,
        from_status: item.fromString || null,
        to_status: item.toString || 'Unknown',
        from_category: null, // جيرا لا تعطي فئة الحالة في الـ changelog مباشرة
        to_category: null,
        author_name: h.author?.displayName || null,
        changed_at: toMysqlDateTime(h.created),
      });
    }
  }
  // الأقدم أولاً لحساب الأزمنة بترتيب صحيح
  changes.sort((a, b) => (a.changed_at < b.changed_at ? -1 : 1));
  return changes;
}

// يستخرج حواف الحجب/الاعتمادية من issuelinks.
// يرجّع [{ source_key, blocker_key, blocked_key }] — blocker_key يحجب blocked_key.
function relSide(phrase) {
  const p = (phrase || '').toLowerCase();
  if (p.includes('blocked by') || p.includes('depends on')) return 'blocked'; // هذه التذكرة محجوبة
  if (p.includes('block') || p.includes('depended on by') || p.includes('dependency of')) return 'blocker'; // هذه التذكرة تحجب
  return null;
}
// يصف روابط الاعتمادية لتذكرة من منظورها — للعرض والحذف.
// depends=true: هذه التذكرة تعتمد على otherKey (محجوبة بها). depends=false: يعتمد عليها الآخر.
export function describeLinks(issue) {
  const links = issue.fields?.issuelinks || [];
  const out = [];
  const handle = (link, other, phrase) => {
    const r = relSide(phrase);
    if (!r || !other?.key) return;
    out.push({
      id: String(link.id),
      depends: r === 'blocked',
      otherKey: other.key,
      otherSummary: other.fields?.summary || '',
      otherStatus: other.fields?.status?.name || '',
    });
  };
  for (const link of links) {
    const type = link.type || {};
    if (link.outwardIssue) handle(link, link.outwardIssue, type.outward);
    if (link.inwardIssue) handle(link, link.inwardIssue, type.inward);
  }
  return out;
}

export function extractBlocks(issue) {
  const src = issue.key;
  const links = issue.fields?.issuelinks || [];
  const edges = [];
  const add = (blocker, blocked, linkId) => {
    if (blocker && blocked && blocker !== blocked) edges.push({ source_key: src, blocker_key: blocker, blocked_key: blocked, link_id: linkId != null ? String(linkId) : null });
  };
  for (const link of links) {
    const type = link.type || {};
    if (link.outwardIssue?.key) {
      const r = relSide(type.outward);
      if (r === 'blocker') add(src, link.outwardIssue.key, link.id);
      else if (r === 'blocked') add(link.outwardIssue.key, src, link.id);
    }
    if (link.inwardIssue?.key) {
      const r = relSide(type.inward);
      if (r === 'blocker') add(src, link.inwardIssue.key, link.id);
      else if (r === 'blocked') add(link.inwardIssue.key, src, link.id);
    }
  }
  // إزالة التكرار
  const seen = new Set();
  return edges.filter((e) => {
    const k = `${e.blocker_key}>${e.blocked_key}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}
