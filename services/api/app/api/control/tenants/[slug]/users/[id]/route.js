import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { findOrgBySlug, runInTenant } from '@/lib/tenancy';
import { deleteUser } from '@/lib/users';

export const dynamic = 'force-dynamic';

// حذف مستخدم داخل قاعدة المستأجر.
export const DELETE = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const org = await findOrgBySlug(params.slug);
  if (!org) return fail('المستأجر غير موجود', 404);
  await runInTenant(org, () => deleteUser(Number(params.id)));
  return ok({ deleted: Number(params.id) });
});
