import { query } from './db.js';
import { ruleConfig } from './config.js';

// محرّك قواعد الاستثناء — نفس منطق الواجهة:
//   • راكد   (stagnant)   : قيد التنفيذ ولم تتغيّر حالته منذ > 3 أيام
//   • مراجعة (review)     : في مرحلة مراجعة منذ > يومين
//   • متأخر  (overdue)    : تجاوز تاريخ الاستحقاق ولم يُنجَز
//   • بدون مسؤول (unassigned): مفتوح وبلا مُسنَد إليه
//
// "مفتوح" = الفئة ليست done. كل العتبات قابلة للضبط عبر ruleConfig.

export const EXCEPTION_TYPES = ['stagnant', 'review', 'overdue', 'unassigned'];

export const EXCEPTION_LABELS_AR = {
  stagnant: 'راكد',
  review: 'مراجعة متأخرة',
  overdue: 'متأخر عن الاستحقاق',
  unassigned: 'بدون مسؤول',
};

// تعبير SQL يحدّد مرحلة "المراجعة" بالاسم (إنجليزي/عربي) لعدم اعتماد إعداد سير عمل خاص.
const REVIEW_MATCH = `(LOWER(t.status) LIKE '%review%' OR t.status LIKE '%مراجعة%')`;

// أعمدة الأعلام المحسوبة لكل تذكرة مفتوحة
function flagsSelect() {
  return `
    (t.status_category = 'indeterminate'
       AND TIMESTAMPDIFF(DAY, t.last_status_change_at, UTC_TIMESTAMP()) > :stagnantDays
    ) AS is_stagnant,
    (${REVIEW_MATCH}
       AND TIMESTAMPDIFF(DAY, t.last_status_change_at, UTC_TIMESTAMP()) > :reviewDays
    ) AS is_review,
    (t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) AS is_overdue,
    (t.assignee_account_id IS NULL) AS is_unassigned,
    TIMESTAMPDIFF(DAY, t.last_status_change_at, UTC_TIMESTAMP()) AS days_in_status
  `;
}

// قائمة الاستثناءات التشغيلية. فلتر اختياري بنطاق تاريخ على jira_created_at.
export async function getExceptions({ from = null, to = null } = {}) {
  const params = {
    stagnantDays: ruleConfig.stagnantDays,
    reviewDays: ruleConfig.reviewDays,
  };
  let dateFilter = '';
  if (from) { dateFilter += ' AND t.jira_created_at >= :from'; params.from = `${from} 00:00:00`; }
  if (to)   { dateFilter += ' AND t.jira_created_at <= :to';   params.to = `${to} 23:59:59`; }

  const rows = await query(
    `SELECT
        t.id, t.issue_key, t.project_key, t.summary, t.status, t.status_category,
        t.priority, t.assignee_name, t.assignee_account_id, t.due_date,
        t.jira_created_at, t.last_status_change_at,
        ${flagsSelect()}
     FROM tickets t
     WHERE t.status_category <> 'done' ${dateFilter}
     HAVING is_stagnant OR is_review OR is_overdue OR is_unassigned
     ORDER BY is_overdue DESC, days_in_status DESC`,
    params
  );

  // نحوّل الأعلام إلى قائمة أسباب مقروءة للواجهة
  return rows.map((r) => {
    const reasons = [];
    if (r.is_stagnant) reasons.push('stagnant');
    if (r.is_review) reasons.push('review');
    if (r.is_overdue) reasons.push('overdue');
    if (r.is_unassigned) reasons.push('unassigned');
    return {
      id: String(r.id),
      key: r.issue_key,
      project: r.project_key,
      summary: r.summary,
      status: r.status,
      priority: r.priority,
      assignee: r.assignee_name,
      dueDate: r.due_date,
      createdAt: r.jira_created_at,
      daysInStatus: r.days_in_status,
      reasons,
      reasonsAr: reasons.map((x) => EXCEPTION_LABELS_AR[x]),
    };
  });
}

// عدّاد كل نوع استثناء (للبطاقات العلوية في الواجهة)
export async function getExceptionCounts() {
  const rows = await query(
    `SELECT
        SUM(t.status_category = 'indeterminate'
            AND TIMESTAMPDIFF(DAY, t.last_status_change_at, UTC_TIMESTAMP()) > :stagnantDays) AS stagnant,
        SUM(${REVIEW_MATCH}
            AND TIMESTAMPDIFF(DAY, t.last_status_change_at, UTC_TIMESTAMP()) > :reviewDays) AS review,
        SUM(t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) AS overdue,
        SUM(t.assignee_account_id IS NULL) AS unassigned
     FROM tickets t
     WHERE t.status_category <> 'done'`,
    { stagnantDays: ruleConfig.stagnantDays, reviewDays: ruleConfig.reviewDays }
  );
  const r = rows[0] || {};
  return {
    stagnant: Number(r.stagnant || 0),
    review: Number(r.review || 0),
    overdue: Number(r.overdue || 0),
    unassigned: Number(r.unassigned || 0),
  };
}

// يكتب لقطة عدد الاستثناءات لتاريخ اليوم (يُستدعى نهاية كل مزامنة) — لرسم الاتجاه.
export async function snapshotExceptions() {
  const counts = await getExceptionCounts();
  for (const type of EXCEPTION_TYPES) {
    await query(
      `INSERT INTO exception_snapshots (snapshot_date, exception_type, count)
       VALUES (CURRENT_DATE, :type, :count)
       ON DUPLICATE KEY UPDATE count = VALUES(count)`,
      { type, count: counts[type] }
    );
  }
  return counts;
}
