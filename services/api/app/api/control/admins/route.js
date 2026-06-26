import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { listAdmins, createAdmin } from '@/lib/control-admins';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireControlPermission('manage_admins');
  return ok({ items: await listAdmins() });
});

export const POST = handler(async (req) => {
  await requireControlPermission('manage_admins');
  const b = await req.json().catch(() => ({}));
  if (!b.username || !b.password) return fail('اسم المستخدم وكلمة المرور مطلوبان', 400);
  const admin = await createAdmin({
    username: b.username,
    password: b.password,
    fullName: b.fullName || null,
    permissions: Array.isArray(b.permissions) ? b.permissions : [],
  });
  return ok(admin);
});
