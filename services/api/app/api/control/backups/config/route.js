import { handler, ok } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { setBackupConfig } from '@/lib/backup-config';

export const dynamic = 'force-dynamic';

// حفظ إعدادات النسخ التلقائي (تفعيل/دورات شهرية/تخزين/مجلّد/احتفاظ).
export const PUT = handler(async (req) => {
  await requireControlPermission('manage_tenants');
  const b = await req.json().catch(() => ({}));
  const patch = {};
  if (b.enabled !== undefined) patch.enabled = !!b.enabled;
  if (b.cyclesPerMonth !== undefined) patch.cyclesPerMonth = Number(b.cyclesPerMonth);
  if (b.storage !== undefined) patch.storage = b.storage === 'external' ? 'external' : 'internal';
  if (b.dir !== undefined) patch.dir = String(b.dir || '/backups');
  if (b.retention !== undefined) patch.retention = Number(b.retention);
  return ok(await setBackupConfig(patch));
});
