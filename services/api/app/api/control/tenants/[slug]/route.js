import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { getOrgDetail, updateOrg, deleteOrg } from '@/lib/orgs';

export const dynamic = 'force-dynamic';

// تفصيل مستأجر + إحصاءاته الحيّة.
export const GET = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const org = await getOrgDetail(params.slug);
  if (!org) return fail('المستأجر غير موجود', 404);
  return ok({ org });
});

// تحديث: الحالة (active/suspended) · الخطة · الحصص · الوحدات.
export const PATCH = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const b = await req.json().catch(() => ({}));
  if (b.status && !['active', 'suspended'].includes(b.status)) {
    return fail('حالة غير صالحة', 400);
  }
  const org = await updateOrg(params.slug, b);
  if (!org) return fail('المستأجر غير موجود', 404);
  return ok({ org });
});

// حذف المستأجر وقاعدته (مدمّر). يتطلّب تأكيداً بالـ slug في الجسم.
export const DELETE = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const b = await req.json().catch(() => ({}));
  if (b.confirm !== params.slug) {
    return fail('للحذف أرسل { "confirm": "<slug>" } مطابقاً.', 400);
  }
  const done = await deleteOrg(params.slug);
  if (!done) return fail('المستأجر غير موجود', 404);
  return ok({ deleted: params.slug });
});
