import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { findOrgBySlug, runInTenant } from '@/lib/tenancy';
import { seedTenantAdmin } from '@/lib/provision';

export const dynamic = 'force-dynamic';

// إنشاء/إعادة تعيين مستخدم أدمن داخل مستأجر (idempotent).
export const POST = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const b = await req.json().catch(() => ({}));
  if (!b.password) return fail('كلمة المرور مطلوبة', 400);
  const org = await findOrgBySlug(params.slug);
  if (!org) return fail('المستأجر غير موجود', 404);
  await runInTenant(org, () => seedTenantAdmin({
    username: b.username || 'admin',
    password: b.password,
  }));
  return ok({ slug: params.slug, username: b.username || 'admin' });
});
