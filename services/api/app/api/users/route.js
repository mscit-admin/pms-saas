import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { listUsers, createUser } from '@/lib/users';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requirePermission('manage_users');
  return ok({ items: await listUsers() });
});

export const POST = handler(async (req) => {
  const me = await requirePermission('manage_users');
  const body = await req.json().catch(() => ({}));
  const result = await createUser({
    username: body.username,
    email: body.email,
    fullName: body.fullName,
    password: body.password,
    roleIds: Array.isArray(body.roleIds) ? body.roleIds : [],
  });
  await logAudit({ action: 'user_create', actorId: me.id, actorName: me.username, targetType: 'user', targetId: body.username, ip: clientIp(req) });
  return ok(result);
});
