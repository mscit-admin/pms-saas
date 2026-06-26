import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { findOrgBySlug, runInTenant } from '@/lib/tenancy';
import { listRoles, createRole } from '@/lib/users';
import { PERMISSIONS, PERMISSION_GROUPS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// إدارة مركزية لأدوار/صلاحيات مستأجر داخل قاعدته + كتالوج الصلاحيات.
export const GET = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const org = await findOrgBySlug(params.slug);
  if (!org) return fail('المستأجر غير موجود', 404);
  const items = await runInTenant(org, () => listRoles());
  return ok({ items, catalog: PERMISSIONS, groups: PERMISSION_GROUPS });
});

export const POST = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const org = await findOrgBySlug(params.slug);
  if (!org) return fail('المستأجر غير موجود', 404);
  const b = await req.json().catch(() => ({}));
  if (!b.name) return fail('اسم الدور مطلوب', 400);
  const role = await runInTenant(org, () => createRole({
    name: b.name, description: b.description || null,
    permissions: Array.isArray(b.permissions) ? b.permissions : [],
  }));
  return ok(role);
});
