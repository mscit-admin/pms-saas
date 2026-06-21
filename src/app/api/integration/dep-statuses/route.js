import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSetting, setSetting } from '@/lib/settings';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// حالات إلغاء الاعتمادية: عند بلوغ التذكرة الحاجبة إحداها تُعتبر الاعتمادية ملغاة.
export const GET = handler(async () => {
  await requirePermission('manage_settings');
  const rows = await query("SELECT DISTINCT status FROM tickets WHERE status IS NOT NULL ORDER BY status");
  const available = rows.map((r) => r.status).filter(Boolean);
  const selected = ((await getSetting('dep_cleared_statuses', '')) || '').split(',').map((s) => s.trim()).filter(Boolean);
  const autoRemove = (await getSetting('dep_auto_remove', '0')) === '1';
  return ok({ available, selected, autoRemove });
});

export const POST = handler(async (req) => {
  const me = await requirePermission('manage_settings');
  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.statuses)) return fail('قائمة الحالات مطلوبة', 400);
  const clean = body.statuses.map((s) => String(s).trim()).filter(Boolean);
  await setSetting('dep_cleared_statuses', clean.join(','));
  if (body.autoRemove !== undefined) await setSetting('dep_auto_remove', body.autoRemove ? 1 : 0);
  await logAudit({ action: 'settings_update', actorId: me.id, actorName: me.username, targetType: 'settings', targetId: 'dep_cleared_statuses', ip: clientIp(req) });
  return ok({ selected: clean, autoRemove: !!body.autoRemove });
});
