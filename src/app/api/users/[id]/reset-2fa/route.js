import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { resetUser2fa } from '@/lib/users';

export const dynamic = 'force-dynamic';

// إعادة ضبط/تعطيل 2FA لمستخدم — للمدير فقط (صلاحية reset_2fa).
export const POST = handler(async (req, { params }) => {
  await requirePermission('reset_2fa');
  const id = Number(params.id);
  await resetUser2fa(id);
  return ok({ id, totpReset: true });
});
