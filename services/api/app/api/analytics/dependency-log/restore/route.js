import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { restoreDependency } from '@/lib/dependencies';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// التراجع عن إلغاء اعتمادية (إعادة الرابط). إجراء على التذاكر → صلاحية act_tickets.
export const POST = handler(async (req) => {
  const me = await requirePermission('act_tickets');
  const { id } = await req.json().catch(() => ({}));
  if (!id) return fail('المعرّف مطلوب', 400);
  const r = await restoreDependency(id);
  await logAudit({ action: 'dependency_restore', actorId: me.id, actorName: me.username, targetType: 'ticket', targetId: r.blocked, detail: `restore ${r.blocker}->${r.blocked}`, ip: clientIp(req) });
  return ok(r);
});
