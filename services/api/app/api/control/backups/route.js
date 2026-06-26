import { handler, ok } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { getBackupConfig } from '@/lib/backup-config';
import { listStoredBackups } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// إعدادات النسخ + قائمة النسخ المخزّنة.
export const GET = handler(async () => {
  await requireControlPermission('manage_tenants');
  const config = await getBackupConfig();
  const items = await listStoredBackups(config.dir);
  return ok({ config, items });
});
