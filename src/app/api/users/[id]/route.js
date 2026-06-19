import { handler, ok, fail } from '@/lib/http';
import { requirePermission, getCurrentUser } from '@/lib/auth';
import { updateUser, deleteUser } from '@/lib/users';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req, { params }) => {
  await requirePermission('manage_users');
  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  await updateUser(id, {
    email: body.email,
    fullName: body.fullName,
    isActive: body.isActive,
    roleIds: body.roleIds,
    password: body.password,
  });
  return ok({ id });
});

export const DELETE = handler(async (req, { params }) => {
  const me = await requirePermission('manage_users');
  const id = Number(params.id);
  if (id === Number(me.id)) return fail('لا يمكنك حذف حسابك الحالي', 400);
  await deleteUser(id);
  return ok({ id });
});
