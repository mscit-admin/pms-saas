import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { resetUser2fa } from '@/lib/users';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// إعادة ضبط/تعطيل 2FA لمستخدم — للمدير فقط (صلاحية reset_2fa).
export const POST = handler(async (req, { params }) => {
  const me = await requirePermission('reset_2fa');
  const id = Number(params.id);
  await resetUser2fa(id);
  await logAudit({ action: 'reset_2fa', actorId: me.id, actorName: me.username, targetType: 'user', targetId: id, ip: clientIp(req) });
  return ok({ id, totpReset: true });
});
