import { query } from './db.js';

// حالة المتابعة الإدارية للاستثناءات: إقرار/تأجيل/مالك/سبب جذري.

export const ROOT_CAUSES = ['blocked', 'waiting_client', 'under_resourced', 'dependency', 'scope_change', 'other'];

// تحديث حالة المتابعة لتذكرة (upsert). تُمرَّر فقط الحقول المُراد تغييرها.
export async function setFollowup(issueKey, { acknowledged, ackBy, note, snoozeUntil, ownerUserId, rootCause }) {
  const fields = {};
  if (acknowledged !== undefined) {
    fields.acknowledged = acknowledged ? 1 : 0;
    fields.ack_by = acknowledged ? ackBy ?? null : null;
    fields.ack_at = acknowledged ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
  }
  if (note !== undefined) fields.note = note ? String(note).slice(0, 500) : null;
  if (snoozeUntil !== undefined) fields.snooze_until = snoozeUntil || null;
  if (ownerUserId !== undefined) fields.owner_user_id = ownerUserId || null;
  if (rootCause !== undefined) {
    fields.root_cause = rootCause && ROOT_CAUSES.includes(rootCause) ? rootCause : null;
  }
  if (Object.keys(fields).length === 0) return;

  // ابنِ عبارة upsert ديناميكياً
  const cols = ['issue_key', ...Object.keys(fields)];
  const placeholders = cols.map((c) => `:${c}`).join(', ');
  const updates = Object.keys(fields).map((c) => `${c} = VALUES(${c})`).join(', ');
  await query(
    `INSERT INTO exception_status (${cols.join(', ')}) VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updates}`,
    { issue_key: issueKey, ...fields }
  );
}
