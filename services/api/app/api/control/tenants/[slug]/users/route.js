import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { findOrgBySlug, runInTenant } from '@/lib/tenancy';
import { listUsers, createUser } from '@/lib/users';
import { assertUserQuota } from '@/lib/orgs';

export const dynamic = 'force-dynamic';

// إدارة مركزية لمستخدمي مستأجر: السرد والإنشاء داخل قاعدته.
export const GET = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const org = await findOrgBySlug(params.slug);
  if (!org) return fail('المستأجر غير موجود', 404);
  const items = await runInTenant(org, () => listUsers());
  return ok({ items });
});

export const POST = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const org = await findOrgBySlug(params.slug);
  if (!org) return fail('المستأجر غير موجود', 404);
  const b = await req.json().catch(() => ({}));
  if (!b.username || !b.password) return fail('اسم المستخدم وكلمة المرور مطلوبان', 400);
  const result = await runInTenant(org, async () => {
    await assertUserQuota(org.slug);
    return createUser({
      username: b.username, email: b.email, fullName: b.fullName,
      password: b.password, roleIds: Array.isArray(b.roleIds) ? b.roleIds : [],
    });
  });
  return ok(result);
});
