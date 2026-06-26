import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { getBackupConfig, setBackupLastRun } from '@/lib/backup-config';
import { backupAllTenants, backupSystem, backupTenantBySlug } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// تشغيل نسخ احتياطي فوري — النطاق: all (كل العملاء) | system (النظام بالكامل) | tenant (عميل محدّد).
export const POST = handler(async (req) => {
  await requireControlPermission('manage_tenants');
  const b = await req.json().catch(() => ({}));
  const cfg = await getBackupConfig();
  let results;
  if (b.scope === 'tenant') {
    if (!b.slug) return fail('حدّد العميل', 400);
    results = await backupTenantBySlug(b.slug, cfg.dir, cfg.retention);
  } else if (b.scope === 'system') {
    results = await backupSystem({ dir: cfg.dir, retention: cfg.retention });
  } else {
    results = await backupAllTenants({ dir: cfg.dir, retention: cfg.retention });
  }
  await setBackupLastRun(new Date().toISOString());
  return ok({ results });
});
