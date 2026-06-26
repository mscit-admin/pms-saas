import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { updateAdmin, deleteAdmin } from '@/lib/control-admins';

export const dynamic = 'force-dynamic';

// تحديث: التفعيل · كلمة المرور · الصلاحيات.
export const PATCH = handler(async (req, { params }) => {
  await requireControlPermission('manage_admins');
  const id = Number(params.id);
  const b = await req.json().catch(() => ({}));
  await updateAdmin(id, b);
  return ok({ id });
});

export const DELETE = handler(async (req, { params }) => {
  const me = await requireControlPermission('manage_admins');
  const id = Number(params.id);
  if (Number(me.id) === id) return fail('لا يمكنك حذف حسابك الحالي.', 400);
  await deleteAdmin(id);
  return ok({ deleted: id });
});
