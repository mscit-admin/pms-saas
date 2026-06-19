import { query } from './db.js';

// سجلّ الدخول والتدقيق: تسجيل الأحداث + قراءتها مع ترقيم وفلترة.

// عنوان IP الحقيقي خلف nginx
export function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || null;
}

// تسجيل حدث (لا يُفشل العملية الأصلية إن تعذّر)
export async function logAudit({
  category = 'audit', action, actorId = null, actorName = null,
  targetType = null, targetId = null, detail = null, ip = null,
}) {
  try {
    await query(
      `INSERT INTO audit_log (category, action, actor_id, actor_name, target_type, target_id, detail, ip)
       VALUES (:category, :action, :actorId, :actorName, :targetType, :targetId, :detail, :ip)`,
      {
        category, action, actorId, actorName,
        targetType, targetId,
        detail: detail ? String(detail).slice(0, 1000) : null,
        ip,
      }
    );
  } catch (e) {
    console.error('[audit]', e.message);
  }
}

// قراءة السجلّات مع فلترة وترقيم
export async function listAudit({ category, action, actorId, from, to, limit = 50, offset = 0 } = {}) {
  // LIMIT/OFFSET لا تُدعَم كوسائط في الجُمل المُحضّرة — ندرجها كأعداد صحيحة مُتحقَّق منها
  const lim = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
  const off = Math.max(0, parseInt(offset, 10) || 0);

  const params = {};
  let where = 'WHERE 1=1';
  if (category) { where += ' AND category = :category'; params.category = category; }
  if (action) { where += ' AND action = :action'; params.action = action; }
  if (actorId) { where += ' AND actor_id = :actorId'; params.actorId = Number(actorId); }
  if (from) { where += ' AND created_at >= :from'; params.from = `${from} 00:00:00`; }
  if (to) { where += ' AND created_at <= :to'; params.to = `${to} 23:59:59`; }

  const totalRows = await query(`SELECT COUNT(*) AS c FROM audit_log ${where}`, params);
  const rows = await query(
    `SELECT id, category, action, actor_id, actor_name, target_type, target_id, detail, ip, created_at
     FROM audit_log ${where} ORDER BY created_at DESC, id DESC LIMIT ${lim} OFFSET ${off}`,
    params
  );
  return { total: Number(totalRows[0]?.c || 0), items: rows };
}
