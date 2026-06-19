import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { listUsers, createUser } from '@/lib/users';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requirePermission('manage_users');
  return ok({ items: await listUsers() });
});

export const POST = handler(async (req) => {
  await requirePermission('manage_users');
  const body = await req.json().catch(() => ({}));
  const result = await createUser({
    username: body.username,
    email: body.email,
    fullName: body.fullName,
    password: body.password,
    roleIds: Array.isArray(body.roleIds) ? body.roleIds : [],
  });
  return ok(result);
});
