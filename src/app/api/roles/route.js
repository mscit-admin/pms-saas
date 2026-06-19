import { handler, ok } from '@/lib/http';
import { requireUser, requirePermission } from '@/lib/auth';
import { listRoles, createRole } from '@/lib/users';

export const dynamic = 'force-dynamic';

// القراءة متاحة لأي مستخدم مسجّل (لتعبئة نماذج المستخدمين)؛ الكتابة تتطلب manage_roles.
export const GET = handler(async () => {
  await requireUser();
  return ok({ items: await listRoles() });
});

export const POST = handler(async (req) => {
  await requirePermission('manage_roles');
  const body = await req.json().catch(() => ({}));
  const result = await createRole({
    name: body.name,
    description: body.description,
    permissions: Array.isArray(body.permissions) ? body.permissions : [],
  });
  return ok(result);
});
