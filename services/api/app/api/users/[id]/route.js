import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { updateUser, deleteUser } from '@/lib/users';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req, { params }) => {
  const me = await requirePermission('manage_users');
  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  await updateUser(id, {
    email: body.email,
    fullName: body.fullName,
    isActive: body.isActive,
    roleIds: body.roleIds,
    password: body.password,
  });
  const detail = [body.password ? 'password' : null, body.isActive !== undefined ? `active=${body.isActive}` : null, Array.isArray(body.roleIds) ? 'roles' : null].filter(Boolean).join(', ');
  await logAudit({ action: 'user_update', actorId: me.id, actorName: me.username, targetType: 'user', targetId: id, detail, ip: clientIp(req) });
  return ok({ id });
});

export const DELETE = handler(async (req, { params }) => {
  const me = await requirePermission('manage_users');
  const id = Number(params.id);
  if (id === Number(me.id)) return fail('لا يمكنك حذف حسابك الحالي', 400);
  await deleteUser(id);
  await logAudit({ action: 'user_delete', actorId: me.id, actorName: me.username, targetType: 'user', targetId: id, ip: clientIp(req) });
  return ok({ id });
});
