import { query } from './db.js';
import { getSetting } from './settings.js';
import { deleteIssueLink } from './jira.js';

// معالجة الاعتماديات المُلغاة: عندما تبلغ التذكرة الحاجبة فئة Done أو إحدى حالات
// الإلغاء المحددة، نسجّل الرابط في dependency_log ثم (إن فُعّل) نحذفه من جيرا.
// تُستدعى في نهاية كل مزامنة.
export async function processClearedDependencies() {
  const autoRemove = (await getSetting('dep_auto_remove', '0')) === '1';
  if (!autoRemove) return { logged: 0, removed: 0 };

  const cleared = ((await getSetting('dep_cleared_statuses', '')) || '')
    .split(',').map((s) => s.trim()).filter(Boolean);

  const params = {};
  let statusCond = "tb.status_category = 'done'";
  if (cleared.length) {
    const ph = cleared.map((_, i) => `:cs${i}`);
    statusCond += ` OR tb.status IN (${ph.join(', ')})`;
    cleared.forEach((s, i) => { params[`cs${i}`] = s; });
  }

  // كل حافة حاجبها بلغ حالة إلغاء — صفّ لكل (حاجبة، محجوبة، رابط)
  const rows = await query(
    `SELECT DISTINCT b.blocker_key, b.blocked_key, b.link_id,
        tb.status AS blocker_status, tb.project_key
     FROM ticket_blocks b
     JOIN tickets tb ON tb.issue_key = b.blocker_key
     WHERE (${statusCond})`,
    params
  );

  let logged = 0;
  let removed = 0;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const deletedLinks = new Set();

  for (const r of rows) {
    // 1) سجّل القيد للمراجعة (idempotent عبر المفتاح الفريد)
    const res = await query(
      `INSERT IGNORE INTO dependency_log (blocker_key, blocked_key, blocker_status, project_key, link_id, removed, cleared_at)
       VALUES (:blocker_key, :blocked_key, :blocker_status, :project_key, :link_id, 1, :cleared_at)`,
      {
        blocker_key: r.blocker_key, blocked_key: r.blocked_key,
        blocker_status: r.blocker_status, project_key: r.project_key,
        link_id: r.link_id, cleared_at: now,
      }
    );
    if (res?.affectedRows > 0) logged += 1;

    // 2) احذف رابط جيرا مرة واحدة لكل link_id
    if (r.link_id && !deletedLinks.has(r.link_id)) {
      deletedLinks.add(r.link_id);
      try { await deleteIssueLink(r.link_id); removed += 1; }
      catch (e) { console.error('deleteIssueLink failed', r.link_id, e?.message || e); }
    }
  }

  // 3) أزِل الحواف المُلغاة من جدول العمل
  if (deletedLinks.size > 0) {
    const ids = Array.from(deletedLinks);
    const ph = ids.map((_, i) => `:l${i}`);
    const p = {};
    ids.forEach((v, i) => { p[`l${i}`] = v; });
    await query(`DELETE FROM ticket_blocks WHERE link_id IN (${ph.join(', ')})`, p);
  }

  return { logged, removed };
}

// قائمة سجلّ الاعتماديات المُلغاة (للمراجعة).
export async function listDependencyLog(limit = 100) {
  const n = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
  const rows = await query(
    `SELECT blocker_key, blocked_key, blocker_status, project_key, removed, cleared_at
     FROM dependency_log ORDER BY cleared_at DESC, id DESC LIMIT ${n}`
  );
  return rows.map((r) => ({
    blocker: r.blocker_key,
    blocked: r.blocked_key,
    status: r.blocker_status,
    project: r.project_key,
    removed: !!r.removed,
    clearedAt: r.cleared_at,
  }));
}
