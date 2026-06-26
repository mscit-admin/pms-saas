import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { findOrgBySlug, runInTenant } from '@/lib/tenancy';
import { deleteRole } from '@/lib/users';

export const dynamic = 'force-dynamic';

// حذف دور داخل قاعدة المستأجر (أدوار النظام محميّة في الطبقة المشتركة).
export const DELETE = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const org = await findOrgBySlug(params.slug);
  if (!org) return fail('المستأجر غير موجود', 404);
  await runInTenant(org, () => deleteRole(Number(params.id)));
  return ok({ deleted: Number(params.id) });
});
