import { handler, ok, fail } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// تحديث بيانات الملف الشخصي للمستخدم الحالي (الاسم الكامل).
export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? '').trim().slice(0, 255);
  if (!fullName) return fail('الاسم مطلوب', 400);
  await query('UPDATE users SET full_name = :n WHERE id = :id', { n: fullName, id: me.id });
  await logAudit({ action: 'user_update', actorId: me.id, actorName: me.username, targetType: 'user', targetId: me.id, detail: 'profile', ip: clientIp(req) });
  return ok({ fullName });
});
