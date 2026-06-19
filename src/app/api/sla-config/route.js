import { handler, ok, fail } from '@/lib/http';
import { requireUser, requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// قراءة إعدادات SLA الحالية (المصدر الحقيقي: جدول sla_config).
export const GET = handler(async () => {
  await requireUser();
  const rows = await query('SELECT priority, sla_days, updated_at FROM sla_config ORDER BY sla_days ASC');
  return ok({
    items: rows.map((r) => ({
      priority: r.priority,
      slaDays: Number(r.sla_days),
      updatedAt: r.updated_at,
    })),
  });
});

// تحديث SLA لأولوية. الجسم: { "priority": "High", "slaDays": 7 }
export const PUT = handler(async (req) => {
  await requirePermission('manage_sla');
  const body = await req.json().catch(() => ({}));
  const priority = body.priority;
  const slaDays = parseInt(body.slaDays, 10);

  if (!['High', 'Medium', 'Low'].includes(priority)) {
    return fail('الأولوية يجب أن تكون High أو Medium أو Low', 400);
  }
  if (!Number.isFinite(slaDays) || slaDays <= 0) {
    return fail('slaDays يجب أن يكون عدداً موجباً', 400);
  }

  await query(
    `INSERT INTO sla_config (priority, sla_days) VALUES (:priority, :slaDays)
     ON DUPLICATE KEY UPDATE sla_days = VALUES(sla_days)`,
    { priority, slaDays }
  );
  return ok({ priority, slaDays });
});
