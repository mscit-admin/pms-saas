import { query } from './db.js';
import { getExceptions, EXCEPTION_LABELS_AR } from './exceptions.js';
import { notify, notifyConfigured } from './notify.js';
import { getJiraSettings } from './jira-settings.js';

// كشف الاستثناءات الجديدة منذ آخر مزامنة وإرسال تنبيه بها.
// نتتبّع (issue_key, exception_type) في alerted_exceptions كي لا نكرّر التنبيه،
// وننظّف ما لم يعد استثناءً كي يُنبَّه مجدداً لو تكرّر لاحقاً.

const ALERTS_ENABLED = process.env.ALERTS_ENABLED !== 'false';

export async function detectAndAlert() {
  if (!ALERTS_ENABLED || !notifyConfigured()) return { sent: 0, skipped: true };

  const exceptions = await getExceptions();

  // المجموعة الحالية من الأزواج (مفتاح + نوع)
  const current = [];
  for (const ex of exceptions) {
    for (const reason of ex.reasons) current.push({ key: ex.key, type: reason, ex });
  }

  // الأزواج التي سبق التنبيه بها
  const prevRows = await query('SELECT issue_key, exception_type FROM alerted_exceptions');
  const prev = new Set(prevRows.map((r) => `${r.issue_key}::${r.exception_type}`));
  const currentSet = new Set(current.map((c) => `${c.key}::${c.type}`));

  // الجديد = موجود الآن ولم يُنبَّه به
  const fresh = current.filter((c) => !prev.has(`${c.key}::${c.type}`));

  // سجّل الجديد وامسح ما لم يعد قائماً
  for (const c of fresh) {
    await query(
      `INSERT IGNORE INTO alerted_exceptions (issue_key, exception_type) VALUES (:k, :t)`,
      { k: c.key, t: c.type }
    );
  }
  for (const p of prevRows) {
    if (!currentSet.has(`${p.issue_key}::${p.exception_type}`)) {
      await query('DELETE FROM alerted_exceptions WHERE issue_key = :k AND exception_type = :t', {
        k: p.issue_key, t: p.exception_type,
      });
    }
  }

  if (fresh.length === 0) return { sent: 0 };

  // اجمع حسب التذكرة لرسالة مرتّبة
  const byKey = new Map();
  for (const c of fresh) {
    if (!byKey.has(c.key)) byKey.set(c.key, { ex: c.ex, types: [] });
    byKey.get(c.key).types.push(EXCEPTION_LABELS_AR[c.type] || c.type);
  }

  const { baseUrl } = await getJiraSettings();
  const lines = [];
  const htmlRows = [];
  for (const [key, v] of byKey) {
    const url = baseUrl ? `${baseUrl}/browse/${key}` : key;
    const reasons = v.types.join('، ');
    lines.push(`• ${key} — ${v.ex.summary} [${reasons}] (${v.ex.assignee || 'بدون مسؤول'})`);
    htmlRows.push(
      `<tr><td><a href="${url}">${key}</a></td><td>${v.ex.summary}</td><td>${reasons}</td><td>${v.ex.assignee || 'بدون مسؤول'}</td></tr>`
    );
  }

  const subject = `مراقب جيرا: ${byKey.size} استثناء جديد يحتاج انتباهاً`;
  const text = `${subject}\n\n${lines.join('\n')}`;
  const html = `
    <div style="font-family:sans-serif">
      <h3>${subject}</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <tr><th>المفتاح</th><th>الملخّص</th><th>السبب</th><th>المسؤول</th></tr>
        ${htmlRows.join('')}
      </table>
    </div>`;

  await notify({ subject, text, html });
  return { sent: byKey.size, freshPairs: fresh.length };
}
