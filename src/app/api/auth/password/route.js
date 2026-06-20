import { handler, ok, fail } from '@/lib/http';
import { requireUser, verifyPassword, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// تغيير المستخدم لكلمة مروره: يتطلب كلمة المرور الحالية.
export const POST = handler(async (req) => {
  const me = await requireUser();
  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) return fail('كلمتا المرور الحالية والجديدة مطلوبتان', 400);
  if (String(newPassword).length < 6) return fail('كلمة المرور الجديدة قصيرة (6 أحرف على الأقل)', 400);

  const rows = await query('SELECT password_hash FROM users WHERE id = :id', { id: me.id });
  const okPass = rows[0] && (await verifyPassword(currentPassword, rows[0].password_hash));
  if (!okPass) return fail('كلمة المرور الحالية غير صحيحة', 401);

  const hash = await hashPassword(newPassword);
  await query('UPDATE users SET password_hash = :h WHERE id = :id', { h: hash, id: me.id });
  await logAudit({ action: 'password_change', actorId: me.id, actorName: me.username, targetType: 'user', targetId: me.id, ip: clientIp(req) });
  return ok({ changed: true });
});
