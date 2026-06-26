import { handler, ok } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { getBackupConfig, setBackupLastRun } from '@/lib/backup-config';
import { backupAllTenants } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// تشغيل نسخ احتياطي فوري لكل العملاء (يدوياً من اللوحة).
export const POST = handler(async () => {
  await requireControlPermission('manage_tenants');
  const cfg = await getBackupConfig();
  const results = await backupAllTenants({ dir: cfg.dir, retention: cfg.retention });
  await setBackupLastRun(new Date().toISOString());
  return ok({ results });
});
