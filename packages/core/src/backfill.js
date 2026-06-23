import { query } from './db.js';
import { ruleConfig } from './config.js';

// إعادة بناء لقطات الاتجاه للأيام الماضية من ticket_history.
// نعيد بناء: متأخر (overdue) · راكد (stagnant) · مراجعة (review).
// "بدون مسؤول" لا يُعاد بناؤه (لا نحفظ تاريخ المُسنَد إليه) — يبدأ خطّه من اليوم.

const DAY_MS = 86400000;
const REVIEW_RE = /review|مراجعة/i;

function parseUtc(s) {
  return s ? new Date(s) : null;
}

export async function backfillTrend({ days = 30 } = {}) {
  const stagnantMs = ruleConfig.stagnantDays * DAY_MS;
  const reviewMs = ruleConfig.reviewDays * DAY_MS;

  // خريطة الحالة → الفئة من الوضع الحالي (نفترض ثباتها)
  const catRows = await query(
    `SELECT DISTINCT status, status_category FROM tickets`
  );
  const catMap = new Map(catRows.map((r) => [r.status, r.status_category]));

  // التذاكر (بتواريخ منسّقة لتفادي التباس المناطق الزمنية)
  const tickets = await query(
    `SELECT id,
       DATE_FORMAT(jira_created_at, '%Y-%m-%dT%H:%i:%sZ') AS created,
       DATE_FORMAT(due_date, '%Y-%m-%d')                  AS due,
       DATE_FORMAT(resolved_at, '%Y-%m-%dT%H:%i:%sZ')     AS resolved,
       status
     FROM tickets`
  );

  // سجلّ التغييرات مرتّباً، مجمّعاً حسب التذكرة
  const hist = await query(
    `SELECT issue_id, from_status, to_status,
       DATE_FORMAT(changed_at, '%Y-%m-%dT%H:%i:%sZ') AS changed
     FROM ticket_history ORDER BY issue_id, changed_at ASC`
  );
  const byIssue = new Map();
  for (const h of hist) {
    if (!byIssue.has(h.issue_id)) byIssue.set(h.issue_id, []);
    byIssue.get(h.issue_id).push({ at: parseUtc(h.changed), from: h.from_status, to: h.to_status });
  }

  // جهّز التذاكر بشكل قابل للحساب
  const prepared = tickets.map((t) => ({
    created: parseUtc(t.created),
    due: t.due, // 'YYYY-MM-DD' أو null
    resolved: parseUtc(t.resolved),
    currentStatus: t.status,
    changes: byIssue.get(t.id) || [],
  }));

  const today = new Date();
  let written = 0;

  for (let k = days; k >= 1; k -= 1) {
    const dayStr = new Date(today.getTime() - k * DAY_MS).toISOString().slice(0, 10);
    const instant = new Date(`${dayStr}T23:59:59Z`);
    const instMs = instant.getTime();

    let overdue = 0;
    let stagnant = 0;
    let review = 0;

    for (const t of prepared) {
      if (!t.created || t.created > instant) continue; // لم تكن موجودة بعد

      // الحالة وآخر تغيّر كما كانت في ذلك اليوم
      let statusOnDay;
      let lastChangeAt;
      if (t.changes.length === 0) {
        statusOnDay = t.currentStatus;
        lastChangeAt = t.created;
      } else {
        let last = null;
        for (const c of t.changes) {
          if (c.at && c.at <= instant) last = c;
          else break;
        }
        if (last) {
          statusOnDay = last.to;
          lastChangeAt = last.at;
        } else {
          statusOnDay = t.changes[0].from || t.currentStatus;
          lastChangeAt = t.created;
        }
      }

      const category = catMap.get(statusOnDay) || 'indeterminate';
      const doneOnDay = (t.resolved && t.resolved <= instant) || category === 'done';
      if (doneOnDay) continue;

      if (t.due && t.due < dayStr) overdue += 1;

      const age = instMs - (lastChangeAt ? lastChangeAt.getTime() : instMs);
      if (category === 'indeterminate' && age > stagnantMs) stagnant += 1;
      if (REVIEW_RE.test(statusOnDay) && age > reviewMs) review += 1;
    }

    for (const [type, count] of [['overdue', overdue], ['stagnant', stagnant], ['review', review]]) {
      await query(
        `INSERT INTO exception_snapshots (snapshot_date, exception_type, count)
         VALUES (:d, :type, :count)
         ON DUPLICATE KEY UPDATE count = VALUES(count)`,
        { d: dayStr, type, count }
      );
      written += 1;
    }
  }

  return { ok: true, daysBackfilled: days, rowsWritten: written };
}
