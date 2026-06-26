import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { findOrgBySlug } from '@/lib/tenancy';
import { tenantDbMetrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

// مقاييس قاعدة بيانات مستأجر بعينه (حجم/جداول/صفوف/أداء).
export const GET = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const org = await findOrgBySlug(params.slug);
  if (!org) return fail('المستأجر غير موجود', 404);
  return ok(await tenantDbMetrics(org));
});
