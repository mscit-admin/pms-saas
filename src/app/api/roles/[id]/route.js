import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { updateRole, deleteRole } from '@/lib/users';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req, { params }) => {
  const me = await requirePermission('manage_roles');
  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  await updateRole(id, { name: body.name, description: body.description, permissions: body.permissions });
  await logAudit({ action: 'role_update', actorId: me.id, actorName: me.username, targetType: 'role', targetId: id, detail: Array.isArray(body.permissions) ? 'permissions' : null, ip: clientIp(req) });
  return ok({ id });
});

export const DELETE = handler(async (req, { params }) => {
  const me = await requirePermission('manage_roles');
  await deleteRole(Number(params.id));
  await logAudit({ action: 'role_delete', actorId: me.id, actorName: me.username, targetType: 'role', targetId: Number(params.id), ip: clientIp(req) });
  return ok({ id: Number(params.id) });
});
