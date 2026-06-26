import { handler, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { findOrgBySlug } from '@/lib/tenancy';
import { dumpTenantDatabase } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// تنزيل نسخة احتياطية (SQL مضغوط) لقاعدة بيانات مستأجر.
export const GET = handler(async (req, { params }) => {
  await requireControlPermission('manage_tenants');
  const org = await findOrgBySlug(params.slug);
  if (!org) return fail('المستأجر غير موجود', 404);
  const gz = await dumpTenantDatabase(org);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${org.dbName}-${stamp}.sql.gz`;
  return new Response(gz, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(gz.length),
      'Cache-Control': 'no-store',
    },
  });
});
